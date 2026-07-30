import os
import shutil
import uuid
import psutil
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.shared.database import get_db, engine
from app.shared.models import (
    User, Profile, UserSettings, ActivityLog, Document, Summary,
    ROUGEReport, LoginHistory, RefreshToken,
    AdminAuditLog, SystemConfiguration, AdminAnnouncement, BackupHistory
)
from app.features.authentication.router import get_current_user, hash_password

router = APIRouter()

# ─────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────
class UserCreatePayload(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"

class UserEditPayload(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    email: Optional[EmailStr] = None

class UserPasswordResetPayload(BaseModel):
    new_password: str

class ModelConfigPayload(BaseModel):
    temperature: float
    max_tokens: int
    is_active: bool

class AnnouncementPayload(BaseModel):
    title: str
    content: str
    type: str = "announcement"  # announcement, maintenance, alert
    expires_in_days: int = 7

class ConfigUpdatePayload(BaseModel):
    max_upload_size_mb: int
    allowed_file_types: str
    default_model: str
    rate_limit_requests: int
    session_timeout_minutes: int

# ─────────────────────────────────────────
# Role Verification & Auditing
# ─────────────────────────────────────────
def verify_role(allowed_roles: List[str]):
    def checker(current_user: User = Depends(get_current_user)):
        # Treat is_admin user from phase 9 as super_admin
        user_role = current_user.role
        if current_user.is_admin and user_role not in ["super_admin", "admin"]:
            user_role = "super_admin"
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return checker

def log_audit(db: Session, admin: User, action: str, target: str = None, status_str: str = "success", request: Request = None):
    ip = "127.0.0.1"
    ua = "Unknown Browser"
    if request:
        ip = request.client.host if request.client else "127.0.0.1"
        ua = request.headers.get("User-Agent", "Unknown Browser")
    
    log = AdminAuditLog(
        admin_id=admin.id,
        admin_name=admin.email,
        action=action,
        target=target,
        ip_address=ip,
        browser=ua,
        status=status_str
    )
    db.add(log)
    db.commit()

# ─────────────────────────────────────────
# 1. Admin Dashboard
# ─────────────────────────────────────────
@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    total_users = db.query(User).count()
    new_users_today = db.query(User).filter(User.created_at >= today_start).count()
    active_users = db.query(User).filter(User.status == "active").count()
    
    docs_uploaded = db.query(Document).count()
    docs_processed = db.query(Document).filter(Document.status == "ready").count()
    summaries_generated = db.query(Summary).count()

    rouge_evals = db.query(ROUGEReport).count()
    
    # Calculate storage size
    total_bytes = 0
    docs = db.query(Document).all()
    for d in docs:
        try:
            size_str = d.size.lower()
            if "kb" in size_str:
                total_bytes += float(size_str.replace("kb", "").strip()) * 1024
            elif "mb" in size_str:
                total_bytes += float(size_str.replace("mb", "").strip()) * 1024 * 1024
            else:
                total_bytes += float(size_str.replace("b", "").strip())
        except:
            total_bytes += len(d.text)
            
    storage_used_label = f"{total_bytes / (1024*1024):.2f} MB" if total_bytes >= 1024*1024 else f"{total_bytes / 1024:.2f} KB"

    # API Telemetry
    total_api_requests = db.query(ActivityLog).count()
    failed_requests = db.query(ActivityLog).filter(ActivityLog.action.like("%FAIL%")).count()

    # Recent Activity (last 10 logs)
    recent_logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10).all()
    recent_activity = [
        {
            "action": log.action,
            "details": log.details or "",
            "timestamp": log.created_at.isoformat() if log.created_at else ""
        }
        for log in recent_logs
    ]

    # System Status
    cpu_use = psutil.cpu_percent()
    ram_use = psutil.virtual_memory().percent
    disk_use = psutil.disk_usage("/").percent

    return {
        "metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "new_users_today": new_users_today,
            "documents_uploaded": docs_uploaded,
            "documents_processed": docs_processed,
            "summaries_generated": summaries_generated,
            "chats_created": chats_created,
            "rouge_evaluations": rouge_evals,
            "storage_used": storage_used_label,
            "storage_used_bytes": total_bytes,
            "api_requests": total_api_requests,
            "failed_requests": failed_requests
        },
        "system": {
            "cpu": cpu_use,
            "ram": ram_use,
            "disk": disk_use,
            "status": "Healthy" if (cpu_use < 85 and ram_use < 90) else "Degraded"
        },
        "recent_activity": recent_activity
    }

# ─────────────────────────────────────────
# 2. User Management
# ─────────────────────────────────────────
@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    users = db.query(User).order_by(User.created_at.desc()).all()
    out = []
    for u in users:
        p = db.query(Profile).filter(Profile.user_id == u.id).first()
        doc_count = db.query(Document).filter(Document.user_id == u.id).count()
        sum_count = db.query(Summary).filter(Summary.user_id == u.id).count()
        out.append({
            "id": u.id,
            "email": u.email,
            "is_verified": u.is_verified,
            "role": u.role,
            "status": u.status,
            "name": p.name if p else u.email.split("@")[0].capitalize(),
            "username": p.username if p else "",
            "avatar": p.avatar if p else "",
            "avatar_data": p.avatar_data if p else "",
            "avatar_mime": p.avatar_mime if p else "",
            "created_at": u.created_at.isoformat(),
            "documents_count": doc_count,
            "summaries_count": sum_count
        })
    return out

@router.post("/users")
def create_user(payload: UserCreatePayload, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    # Check if duplicate email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already taken.")
        
    hashed = hash_password(payload.password)
    user = User(
        email=payload.email,
        hashed_password=hashed,
        is_verified=True,
        role=payload.role,
        status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    p = Profile(user_id=user.id, name=payload.name)
    settings = UserSettings(user_id=user.id)
    db.add(p)
    db.add(settings)
    db.commit()

    log_audit(db, current_user, "USER_CREATE", f"Created user {payload.email}", request=request)
    return {"status": "success", "message": "User created successfully."}

@router.put("/users/{user_id}")
def edit_user(user_id: str, payload: UserEditPayload, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if payload.email is not None and payload.email != user.email:
        dup = db.query(User).filter(User.email == payload.email).first()
        if dup:
            raise HTTPException(status_code=400, detail="Email address is already in use.")
        user.email = payload.email

    if payload.role is not None:
        if current_user.role != "super_admin" and current_user.is_admin is False:
            raise HTTPException(status_code=403, detail="Only Super Admins can alter roles.")
        user.role = payload.role
        if payload.role in ["super_admin", "admin"]:
            user.is_admin = True
        else:
            user.is_admin = False

    if payload.status is not None:
        user.status = payload.status

    if payload.name is not None:
        p = db.query(Profile).filter(Profile.user_id == user.id).first()
        if p:
            p.name = payload.name
            
    db.commit()
    log_audit(db, current_user, "USER_EDIT", f"Edited user details for {user.email}", request=request)
    return {"status": "success", "message": "User settings updated successfully."}

@router.delete("/users/{user_id}")
def delete_user(user_id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    email = user.email
    db.delete(user)
    db.commit()

    log_audit(db, current_user, "USER_DELETE", f"Permanently deleted user {email}", request=request)
    return {"status": "success", "message": "User permanently removed from system."}

@router.post("/users/{user_id}/reset-password")
def admin_reset_password(user_id: str, payload: UserPasswordResetPayload, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    log_audit(db, current_user, "USER_PASSWORD_RESET", f"Forced password reset on {user.email}", request=request)
    return {"status": "success", "message": "User password reset successfully."}

@router.post("/users/{user_id}/force-logout")
def force_logout_user(user_id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    # Revoke all refresh tokens
    tokens = db.query(RefreshToken).filter(RefreshToken.user_id == user_id).all()
    for t in tokens:
        t.is_revoked = True
    db.commit()
    
    target_user = db.query(User).filter(User.id == user_id).first()
    email = target_user.email if target_user else "Unknown"
    log_audit(db, current_user, "USER_FORCE_LOGOUT", f"Forced logout on {email}", request=request)
    return {"status": "success", "message": "User logged out from all active devices."}

# ─────────────────────────────────────────
# 3. Document Management
# ─────────────────────────────────────────
@router.get("/documents")
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    docs = db.query(Document).order_by(Document.last_modified.desc()).all()
    out = []
    for d in docs:
        owner = db.query(User).filter(User.id == d.user_id).first()
        out.append({
            "id": d.id,
            "name": d.name,
            "size": d.size,
            "type": d.type,
            "upload_time": d.upload_time,
            "status": d.status,
            "is_deleted": d.deleted_at is not None,
            "owner_email": owner.email if owner else "Deleted User",
            "owner_id": d.user_id
        })
    return out

@router.delete("/documents/{doc_id}")
def admin_delete_document(doc_id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    name = doc.name
    db.delete(doc)
    db.commit()

    log_audit(db, current_user, "DOCUMENT_DELETE", f"Moderated / Deleted document {name}", request=request)
    return {"status": "success", "message": "Document permanently removed."}

# ─────────────────────────────────────────
# 4. Summary Management
# ─────────────────────────────────────────
@router.get("/summaries")
def list_summaries(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    sums = db.query(Summary).order_by(Summary.created_at.desc()).all()
    out = []
    for s in sums:
        owner = db.query(User).filter(User.id == s.user_id).first()
        out.append({
            "id": s.id,
            "title": s.title,
            "model_used": s.model_used,
            "compression_ratio": s.compression_ratio,
            "created_at": s.created_at.isoformat(),
            "owner_email": owner.email if owner else "Deleted User"
        })
    return out

@router.delete("/summaries/{sum_id}")
def admin_delete_summary(sum_id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    summary = db.query(Summary).filter(Summary.id == sum_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found.")
    
    title = summary.title
    db.delete(summary)
    db.commit()

    log_audit(db, current_user, "SUMMARY_DELETE", f"Deleted summary: {title}", request=request)
    return {"status": "success", "message": "Summary deleted."}

# ─────────────────────────────────────────
# 6. Model Management
# ─────────────────────────────────────────
@router.get("/models")
def get_models_config(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    models = [
        {"id": "distilbart", "name": "DistilBART-CNN", "speed": "85 wps", "is_active": True, "latency": 0.6},
        {"id": "bart", "name": "BART-Large", "speed": "35 wps", "is_active": True, "latency": 1.8},
        {"id": "t5", "name": "T5-Base", "speed": "45 wps", "is_active": True, "latency": 1.2},
        {"id": "pegasus", "name": "PEGASUS-Large", "speed": "18 wps", "is_active": True, "latency": 3.2},
        {"id": "flant5", "name": "FLAN-T5-Large", "speed": "30 wps", "is_active": True, "latency": 2.1},
        {"id": "llama", "name": "Llama-3-8B", "speed": "12 wps", "is_active": True, "latency": 5.4},
        {"id": "gemma", "name": "Gemma-2B-IT", "speed": "25 wps", "is_active": True, "latency": 2.8},
        {"id": "mistral", "name": "Mistral-7B", "speed": "15 wps", "is_active": True, "latency": 4.8},
        {"id": "phi", "name": "Phi-3-Mini", "speed": "28 wps", "is_active": True, "latency": 2.4}
    ]

    out = []
    for m in models:
        # Load stats
        count = db.query(Summary).filter(Summary.model_used == m["id"]).count()
        avg_r1 = db.query(func.avg(ROUGEReport.rouge1)).filter(ROUGEReport.model_used == m["id"]).scalar() or 0.0
        
        # Override is_active using SystemConfig key if modified
        conf = db.query(SystemConfiguration).filter(SystemConfiguration.key == f"model_active_{m['id']}").first()
        is_active = (conf.value == "true") if conf else m["is_active"]

        out.append({
            "id": m["id"],
            "name": m["name"],
            "speed": m["speed"],
            "latency": m["latency"],
            "is_active": is_active,
            "usage_count": count,
            "average_rouge1": round(float(avg_r1), 4)
        })
    return out

@router.put("/models/{model_id}")
def update_model_config(model_id: str, payload: ModelConfigPayload, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    conf = db.query(SystemConfiguration).filter(SystemConfiguration.key == f"model_active_{model_id}").first()
    if not conf:
        conf = SystemConfiguration(key=f"model_active_{model_id}", value=str(payload.is_active).lower())
        db.add(conf)
    else:
        conf.value = str(payload.is_active).lower()
        
    db.commit()
    log_audit(db, current_user, "MODEL_CONFIG_UPDATE", f"Modified configuration status for AI model {model_id} to active={payload.is_active}", request=request)
    return {"status": "success", "message": f"Model configuration {model_id} updated."}

# ─────────────────────────────────────────
# 7. System Health
# ─────────────────────────────────────────
@router.get("/health")
def get_extended_health(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    try:
        db.execute("PRAGMA integrity_check;")
        db_status = "Healthy"
    except Exception:
        db_status = "Corrupted"

    cpu = psutil.cpu_percent()
    memory = psutil.virtual_memory().percent
    disk = psutil.disk_usage("/").percent
    queue_len = db.query(Document).filter(Document.status == "processing").count()

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "api": "Healthy",
            "database": db_status,
            "cache": "Healthy",
            "workers": "Healthy"
        },
        "metrics": {
            "cpu_utilization": cpu,
            "ram_utilization": memory,
            "disk_utilization": disk,
            "worker_queue_length": queue_len
        }
    }

# ─────────────────────────────────────────
# 8. Storage Configuration & Cleanup
# ─────────────────────────────────────────
@router.get("/storage")
def get_storage_breakdown(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    docs = db.query(Document).all()
    doc_bytes = sum(len(d.text) for d in docs)
    
    summaries = db.query(Summary).all()
    sum_bytes = sum(len(s.summary_text) for s in summaries)
    
    chats = db.query(ChatMessage).all()
    chat_bytes = sum(len(c.message) for c in chats)

    logs = db.query(ActivityLog).all()
    log_bytes = sum(len(str(l.details)) for l in logs)

    def fmt(b):
        if b >= 1024*1024: return f"{b/(1024*1024):.2f} MB"
        return f"{b/1024:.2f} KB"

    total = doc_bytes + sum_bytes + chat_bytes + log_bytes
    return {
        "total": fmt(total),
        "total_bytes": total,
        "breakdown": [
            {"category": "Documents", "size": fmt(doc_bytes), "bytes": doc_bytes, "color": "#3b82f6"},
            {"category": "Summaries", "size": fmt(sum_bytes), "bytes": sum_bytes, "color": "#8b5cf6"},
            {"category": "Chats", "size": fmt(chat_bytes), "bytes": chat_bytes, "color": "#10b981"},
            {"category": "Audit & Activity Logs", "size": fmt(log_bytes), "bytes": log_bytes, "color": "#f59e0b"}
        ]
    }

# ─────────────────────────────────────────
# 9. Audit Logs
# ─────────────────────────────────────────
@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin", "moderator"]))):
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.timestamp.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "admin_name": l.admin_name,
            "action": l.action,
            "target": l.target,
            "ip_address": l.ip_address,
            "browser": l.browser.split(" ")[0] if l.browser else "Unknown",
            "status": l.status,
            "timestamp": l.timestamp.isoformat()
        } for l in logs
    ]

# ─────────────────────────────────────────
# 10. System Configuration (Max limits)
# ─────────────────────────────────────────
@router.get("/config")
def get_system_config(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    out = {}
    for key, desc, default in [
        ("max_upload_size_mb", "Maximum permitted ingestion upload file size", "15"),
        ("allowed_file_types", "Ingestion whitelist extensions separated by comma", ".pdf,.docx,.txt,.md"),
        ("default_model", "System default AI summarization model", "distilbart"),
        ("rate_limit_requests", "Requests limit per minute window per user", "60"),
        ("session_timeout_minutes", "Session expiry duration before force logout", "60")
    ]:
        conf = db.query(SystemConfiguration).filter(SystemConfiguration.key == key).first()
        out[key] = conf.value if conf else default
    return out

@router.put("/config")
def update_system_config(payload: ConfigUpdatePayload, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    for key, value in [
        ("max_upload_size_mb", str(payload.max_upload_size_mb)),
        ("allowed_file_types", payload.allowed_file_types),
        ("default_model", payload.default_model),
        ("rate_limit_requests", str(payload.rate_limit_requests)),
        ("session_timeout_minutes", str(payload.session_timeout_minutes))
    ]:
        conf = db.query(SystemConfiguration).filter(SystemConfiguration.key == key).first()
        if not conf:
            conf = SystemConfiguration(key=key, value=value)
            db.add(conf)
        else:
            conf.value = value
            
    db.commit()
    log_audit(db, current_user, "SYSTEM_CONFIG_UPDATE", "Updated core system limit rules", request=request)
    return {"status": "success", "message": "System configuration updated."}

# ─────────────────────────────────────────
# 11. Announcements Control
# ─────────────────────────────────────────
@router.get("/announcements")
def list_announcements(db: Session = Depends(get_db)):
    announcements = db.query(AdminAnnouncement).filter(
        AdminAnnouncement.is_active == True
    ).order_by(AdminAnnouncement.created_at.desc()).all()
    return announcements

@router.post("/announcements")
def create_announcement(payload: AnnouncementPayload, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin", "admin"]))):
    expiry = datetime.utcnow() + timedelta(days=payload.expires_in_days)
    ann = AdminAnnouncement(
        title=payload.title,
        content=payload.content,
        type=payload.type,
        is_active=True,
        expires_at=expiry
    )
    db.add(ann)
    db.commit()
    log_audit(db, current_user, "ANNOUNCEMENT_CREATE", f"Broadcasted message: {payload.title}", request=request)
    return {"status": "success", "message": "Announcement created."}

# ─────────────────────────────────────────
# 12. Backup & Restore
# ─────────────────────────────────────────
@router.get("/backups")
def get_backup_history(db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin"]))):
    history = db.query(BackupHistory).order_by(BackupHistory.created_at.desc()).all()
    return history

@router.post("/backups")
def trigger_backup(request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin"]))):
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    db_file = os.path.join(backend_dir, "saas_summarizer.db")
    if not os.path.exists(db_file):
        raise HTTPException(status_code=500, detail="Database file not found.")

    backups_dir = os.path.join(backend_dir, "backups")
    os.makedirs(backups_dir, exist_ok=True)
    filename = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.db"
    dest = os.path.join(backups_dir, filename)

    try:
        shutil.copyfile(db_file, dest)
        size = f"{os.path.getsize(dest) / 1024:.2f} KB"
        history = BackupHistory(
            filename=filename,
            filepath=dest,
            filesize=size,
            status="completed"
        )
        db.add(history)
        db.commit()
        log_audit(db, current_user, "BACKUP_CREATE", f"Generated system backup: {filename}", request=request)
        return {"status": "success", "message": "System backup generated successfully.", "backup": filename}
    except Exception as e:
        log_audit(db, current_user, "BACKUP_CREATE", f"Backup failed: {str(e)}", "failed", request=request)
        raise HTTPException(status_code=500, detail=f"Backup generation error: {str(e)}")

@router.post("/backups/{backup_id}/restore")
def restore_backup(backup_id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(verify_role(["super_admin"]))):
    backup = db.query(BackupHistory).filter(BackupHistory.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup record not found.")

    filepath = backup.filepath
    if not os.path.exists(filepath):
        raise HTTPException(status_code=500, detail="Backup file missing on disk.")

    try:
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        db_file = os.path.join(backend_dir, "saas_summarizer.db")
        shutil.copyfile(filepath, db_file)
        log_audit(db, current_user, "BACKUP_RESTORE", f"Restored system database from {backup.filename}", request=request)
        return {"status": "success", "message": "Database successfully restored from backup."}
    except Exception as e:
        log_audit(db, current_user, "BACKUP_RESTORE", f"Database restoration failed: {str(e)}", "failed", request=request)
        raise HTTPException(status_code=500, detail=f"Database restoration error: {str(e)}")
