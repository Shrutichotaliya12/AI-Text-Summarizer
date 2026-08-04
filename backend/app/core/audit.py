import hashlib
import json
import logging
import os
import sys
import tempfile
from datetime import datetime, timezone
from fastapi import Request
from app.shared.models import User

# Ensure logs directory exists safely
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

def setup_logs_dir():
    primary_dir = os.path.join(os.getcwd(), "logs")
    if ENVIRONMENT == "production":
        primary_dir = os.path.join(tempfile.gettempdir(), "ai-text-summarizer", "logs")
        
    try:
        os.makedirs(primary_dir, exist_ok=True)
        return primary_dir
    except OSError:
        pass
        
    try:
        fallback = os.path.join(tempfile.gettempdir(), "logs")
        os.makedirs(fallback, exist_ok=True)
        return fallback
    except OSError:
        return None

LOGS_DIR = setup_logs_dir()

def get_audit_logger(name: str, filename: str):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    
    if not logger.handlers:
        formatter = logging.Formatter('%(message)s')
        handler_added = False
        
        if LOGS_DIR is not None:
            try:
                fh = logging.FileHandler(os.path.join(LOGS_DIR, filename))
                fh.setFormatter(formatter)
                logger.addHandler(fh)
                handler_added = True
            except OSError:
                pass
                
        if not handler_added:
            sh = logging.StreamHandler(sys.stdout)
            sh.setFormatter(formatter)
            logger.addHandler(sh)
            
    return logger

otp_logger = get_audit_logger("otp_audit", "otp_audit.log")
email_logger = get_audit_logger("email_audit", "email_audit.log")
sys_logger = logging.getLogger("uvicorn.error")

def log_otp_generation(request: Request, user: User, otp: str, reason: str) -> str:
    if not request:
        sys_logger.critical(f"CRITICAL SECURITY: OTP generated without an HTTP request for user {user.email}! Reason: {reason}")
        ip = "Unknown"
        ua = "Unknown"
        endpoint = "Unknown"
    else:
        ip = request.client.host if request.client else "Unknown"
        ua = request.headers.get("User-Agent", "Unknown")
        endpoint = request.url.path

    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    
    log_entry = {
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "api_endpoint": endpoint,
        "client_ip": ip,
        "user_agent": ua,
        "user_email": user.email,
        "user_id": user.id,
        "otp_hash": otp_hash,
        "reason": reason
    }
    
    otp_logger.info(json.dumps(log_entry))
    return otp_hash

def log_email_sent(to_email: str, subject: str, otp_hash: str):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "to_email": to_email,
        "subject": subject,
        "otp_hash": otp_hash
    }
    email_logger.info(json.dumps(log_entry))
