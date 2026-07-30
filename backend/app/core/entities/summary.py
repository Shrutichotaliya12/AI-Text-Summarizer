from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class SummaryJob:
    id: Optional[str] # Celery Task ID
    document_id: int
    user_id: int
    model_name: str
    min_length: int
    max_length: int
    summary_text: Optional[str]
    status: str # PENDING, SUCCESS, FAILURE
    created_at: datetime
    completed_at: Optional[datetime] = None

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "user_id": self.user_id,
            "model_name": self.model_name,
            "min_length": self.min_length,
            "max_length": self.max_length,
            "summary_text": self.summary_text,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
