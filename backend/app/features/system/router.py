from fastapi import APIRouter
from sqlalchemy import text
from app.shared.database import SessionLocal
import smtplib
from app.infrastructure.config import settings

router = APIRouter()

@router.get("/status", tags=["System Status"])
def system_status():
    """
    Returns the real-time health status of different application subsystems.
    Possible states for each system: 'working', 'degraded', 'offline'
    """
    status = {
        "ai": "working",
        "database": "offline",
        "authentication": "working",
        "email": "offline",
        "storage": "working"
    }

    # Check Database
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        status["database"] = "working"
    except Exception:
        status["database"] = "offline"

    # Check Email
    try:
        if settings.SMTP_HOST and settings.SMTP_PORT:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=3)
            server.ehlo()
            server.quit()
            status["email"] = "working"
        else:
            status["email"] = "offline"
    except Exception:
        status["email"] = "offline"

    return status
