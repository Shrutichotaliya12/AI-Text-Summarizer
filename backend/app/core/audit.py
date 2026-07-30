import hashlib
import json
import logging
import os
from datetime import datetime
from fastapi import Request
from app.shared.models import User

# Ensure logs directory exists
LOGS_DIR = os.path.join(os.getcwd(), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

def get_audit_logger(name: str, filename: str):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    
    if not logger.handlers:
        fh = logging.FileHandler(os.path.join(LOGS_DIR, filename))
        fh.setFormatter(logging.Formatter('%(message)s'))
        logger.addHandler(fh)
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
        "timestamp": datetime.utcnow().isoformat(),
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
        "timestamp": datetime.utcnow().isoformat(),
        "to_email": to_email,
        "subject": subject,
        "otp_hash": otp_hash
    }
    email_logger.info(json.dumps(log_entry))
