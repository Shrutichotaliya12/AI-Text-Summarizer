from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.shared.database import get_db
from app.shared.models import Summary
from app.features.authentication.router import get_current_user, User

router = APIRouter()

@router.get("/")
def list_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summaries = db.query(Summary).filter(Summary.user_id == current_user.id).order_by(Summary.created_at.desc()).all()
    return {
        "history": [
            {
                "id": s.id,
                "name": s.title,
                "size": f"{len(s.original_text.split())} words",
                "type": s.language,
                "wordCount": len(s.summary_text.split()),
                "date": s.created_at.isoformat()
            }
            for s in summaries
        ]
    }

@router.delete("/{item_id}")
def delete_history_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = db.query(Summary).filter(Summary.id == item_id, Summary.user_id == current_user.id).first()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found")
    db.delete(summary)
    db.commit()
    return {"status": "success", "message": f"History item {item_id} deleted."}
