import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.shared.database import get_db
from app.shared.models import User, Notification, ActivityLog, UserSettings
from app.features.authentication.router import get_current_user

router = APIRouter()

# ─────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────
class NotificationCreate(BaseModel):
    title: Optional[str] = None
    text: str
    event_type: str
    priority: str = "medium"
    source_module: Optional[str] = None
    related_document_id: Optional[str] = None


class NotificationPreferences(BaseModel):
    email_notifications: Optional[bool] = None
    toast_alerts: Optional[bool] = None
    sound_alerts: Optional[bool] = None
    desktop_notifications: Optional[bool] = None

# ─────────────────────────────────────────
# Notifications Endpoints
# ─────────────────────────────────────────
@router.get("/")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 50,
    unread_only: bool = False,
    is_archived: bool = False,
    is_pinned: bool = None,
    priority: str = None,
    search: str = None
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)
        
    query = query.filter(Notification.is_archived == is_archived)

    if is_pinned is not None:
        query = query.filter(Notification.is_pinned == is_pinned)
        
    if priority:
        query = query.filter(Notification.priority == priority)
        
    if search:
        query = query.filter(
            or_(
                Notification.title.ilike(f"%{search}%"),
                Notification.text.ilike(f"%{search}%")
            )
        )

    total = query.count()
    notifications = query.order_by(desc(Notification.created_at)).offset((page - 1) * limit).limit(limit).all()

    notifications_data = []
    for notif in notifications:
        notifications_data.append({
            "id": notif.id,
            "user_id": notif.user_id,
            "title": notif.title,
            "text": notif.text,
            "event_type": notif.event_type,
            "priority": notif.priority,
            "is_read": notif.is_read,
            "read": notif.is_read,
            "is_pinned": notif.is_pinned,
            "is_archived": notif.is_archived,
            "source_module": notif.source_module,
            "related_document_id": notif.related_document_id,

            "created_at": notif.created_at
        })

    return {
        "items": notifications_data,
        "notifications": notifications_data,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

def create_notification(
    db: Session,
    user_id: str,
    text: str,
    title: Optional[str] = None,
    event_type: str = "system",
    priority: str = "medium",
    source_module: Optional[str] = None,
    related_document_id: Optional[str] = None,

):
    notif = Notification(
        user_id=user_id,
        title=title,
        text=text,
        event_type=event_type,
        priority=priority,
        source_module=source_module,
        related_document_id=related_document_id
    )
    db.add(notif)
    db.commit()
    return {"status": "success", "id": notif.id}

@router.post("/")
def create_notification_endpoint(
    payload: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_notification(
        db=db,
        user_id=current_user.id,
        text=payload.text,
        title=payload.title,
        event_type=payload.event_type,
        priority=payload.priority,
        source_module=payload.source_module,
        related_document_id=payload.related_document_id
    )

@router.put("/{notif_id}/read")
def mark_read(notif_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.put("/mark-all-read")
@router.post("/mark-all-read")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, 
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "success"}

@router.delete("/")
@router.delete("")
def delete_all_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()
    return {"status": "success"}

@router.delete("/{notif_id}")
def delete_notification(notif_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"status": "success"}

@router.put("/{notif_id}/archive")
def archive_notification(notif_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_archived = not notif.is_archived
    db.commit()
    return {"status": "success", "is_archived": notif.is_archived}

@router.put("/{notif_id}/pin")
def pin_notification(notif_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_pinned = not notif.is_pinned
    db.commit()
    return {"status": "success", "is_pinned": notif.is_pinned}

@router.put("/preferences")
def update_preferences(payload: NotificationPreferences, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    
    if payload.email_notifications is not None: settings.email_notifications = payload.email_notifications
    if payload.toast_alerts is not None: settings.toast_alerts = payload.toast_alerts
    if payload.sound_alerts is not None: settings.sound_alerts = payload.sound_alerts
    if payload.desktop_notifications is not None: settings.desktop_notifications = payload.desktop_notifications
    
    db.commit()
    return {"status": "success"}

# ─────────────────────────────────────────
# Activity Timeline Endpoints
# ─────────────────────────────────────────
@router.get("/activity")
def get_activity_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 50,
    module: str = None,
    search: str = None
):
    query = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)
    
    if module:
        query = query.filter(ActivityLog.module == module)
        
    if search:
        query = query.filter(
            or_(
                ActivityLog.action.ilike(f"%{search}%"),
                ActivityLog.details.ilike(f"%{search}%")
            )
        )
        
    total = query.count()
    activities = query.order_by(desc(ActivityLog.timestamp)).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "items": activities,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }
