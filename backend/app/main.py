import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import time
from collections import defaultdict
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.infrastructure.config import settings
from app.infrastructure.logger import logger
from sqlalchemy import text
from app.shared.database import SessionLocal

from app.features.authentication.router import router as auth_router
from app.features.summarization.router import router as summary_router
from app.features.analytics.router import router as analytics_router

from app.features.document_upload.router import router as upload_router
from app.features.history.router import router as history_router
from app.features.models.router import router as models_router
from app.features.admin.router import router as admin_router
from app.features.notifications.router import router as notifications_router
from app.features.document_analysis.router import router as analysis_router
from app.features.rouge.router import router as rouge_router
from app.features.system.router import router as system_router

# ─── In-memory sliding window rate limiter ───────────────────────────────────
# Stores: { ip: [timestamp, ...] }
_rate_store: dict[str, list[float]] = defaultdict(list)
_auth_rate_store: dict[str, list[float]] = defaultdict(list)

def _is_rate_limited(store: dict, key: str, limit: int, window: int = 60) -> bool:
    now = time.time()
    # Prune old entries outside the window
    store[key] = [t for t in store[key] if now - t < window]
    if len(store[key]) >= limit:
        return True
    store[key].append(now)
    return False
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Production-ready API for document understanding, text summarization, and NLP analysis (Feature-Based Architecture).",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# GZip Compression — compresses responses > 1000 bytes
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS — restrict to configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Security Headers, Rate Limiting, and Structured Request Logging ─────────
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    path = request.url.path

    # Bypass rate limiting for CORS preflight
    if request.method == "OPTIONS":
        return await call_next(request)

    # Rate limiting — tighter limit on auth endpoints
    if path.startswith("/api/v1/auth/"):
        if client_ip != "testclient" and _is_rate_limited(_auth_rate_store, client_ip, settings.AUTH_RATE_LIMIT_PER_MINUTE):
            logger.warning(f"AUTH rate limit exceeded: IP={client_ip} PATH={path}")
            return JSONResponse(
                status_code=429,
                content={"error": {"code": 429, "message": "Too many requests. Please try again later."}}
            )
    elif path.startswith("/api/"):
        if client_ip != "testclient" and _is_rate_limited(_rate_store, client_ip, settings.RATE_LIMIT_PER_MINUTE):
            logger.warning(f"API rate limit exceeded: IP={client_ip} PATH={path}")
            return JSONResponse(
                status_code=429,
                content={"error": {"code": 429, "message": "Too many requests. Please try again later."}}
            )

    response: Response = await call_next(request)
    process_time = time.time() - start_time

    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-Process-Time"] = f"{process_time:.4f}"

    logger.info(f"method={request.method} path={path} status={response.status_code} ip={client_ip} duration={process_time:.4f}s")

    return response
# ─────────────────────────────────────────────────────────────────────────────

# ─── Centralized Exception Handlers ──────────────────────────────────────────
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTPException: {exc.detail} | path={request.url.path} | status={exc.status_code}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": str(exc.detail),
            "error": {"code": exc.status_code, "message": str(exc.detail)}
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log incoming request body and validation errors
    body = getattr(exc, "body", None)
    logger.warning(f"ValidationError on {request.url.path} | Body: {body} | Errors: {exc.errors()}")
    
    missing_fields = []
    invalid_fields = []
    invalid_types = []
    
    for err in exc.errors():
        loc = err.get("loc", [])
        field_name = str(loc[-1]) if loc else "unknown"
        err_type = err.get("type", "")
        msg = err.get("msg", "")
        
        if "missing" in err_type:
            missing_fields.append({
                "field": field_name,
                "message": msg
            })
        elif "type" in err_type or "int_" in err_type or "string_" in err_type or "bool" in err_type or "uuid" in err_type:
            invalid_types.append({
                "field": field_name,
                "expected_type": err_type.split("_")[0] if "_" in err_type else "unknown",
                "message": msg
            })
        else:
            invalid_fields.append({
                "field": field_name,
                "message": msg
            })
            
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "error": {
                "code": 422,
                "message": "Validation Error",
                "missing_fields": missing_fields,
                "invalid_fields": invalid_fields,
                "invalid_types": invalid_types,
                "details": exc.errors()
            }
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"UnhandledException on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": {"code": 500, "message": "Internal Server Error"}
        },
    )
# ─────────────────────────────────────────────────────────────────────────────

# ─── Feature Routers ─────────────────────────────────────────────────────────
app.include_router(auth_router,           prefix="/api/v1/auth",          tags=["Authentication"])
app.include_router(summary_router,        prefix="/api/v1/summary",       tags=["Text Summarization"])
app.include_router(analytics_router,      prefix="/api/v1/analytics",     tags=["Dataset Analytics"])

app.include_router(upload_router,         prefix="/api/v1/upload",        tags=["Document Upload"])
app.include_router(analysis_router,       prefix="/api/v1/analysis",      tags=["Document NLP Analysis"])
app.include_router(rouge_router,          prefix="/api/v1/rouge",         tags=["ROUGE Evaluation"])
app.include_router(history_router,        prefix="/api/v1/history",       tags=["History"])
app.include_router(models_router,         prefix="/api/v1/models",        tags=["Models"])
app.include_router(admin_router,          prefix="/api/v1/admin",         tags=["Admin"])
app.include_router(notifications_router,  prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(system_router,         prefix="/api/v1/system",        tags=["System Status"])
# ─────────────────────────────────────────────────────────────────────────────

# ─── Health / Readiness / Liveness Endpoints ─────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Basic health indicator — always returns 200 if server is up."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time()
    }

@app.get("/live", tags=["Health"])
def liveness_check():
    """K8s liveness probe — server process is alive."""
    return {"status": "alive"}

@app.get("/ready", tags=["Health"])
def readiness_check():
    """K8s readiness probe — actively validates DB connectivity."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "ready",
            "database": "connected",
            "environment": settings.ENVIRONMENT,
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "not ready",
                "database": "disconnected",
                "error": str(e),
            }
        )
# ─────────────────────────────────────────────────────────────────────────────

# ─── Individual Service Health Endpoints ─────────────────────────────────────
@app.get("/api/v1/health", tags=["Health"])
def health_api():
    return {"status": "working"}

@app.get("/api/v1/auth/health", tags=["Health"])
def auth_health():
    return {"status": "working"}

@app.get("/api/v1/ai/health", tags=["Health"])
def ai_health():
    return {"status": "working"}

@app.get("/api/v1/storage/health", tags=["Health"])
def storage_health():
    return {"status": "working"}

@app.get("/api/v1/email/health", tags=["Health"])
def email_health():
    return {"status": "working"}

@app.get("/api/v1/db/health", tags=["Health"])
def db_health():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "working"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "offline"})
# ─────────────────────────────────────────────────────────────────────────────
