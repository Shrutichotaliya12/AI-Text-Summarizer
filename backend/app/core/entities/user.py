from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class User:
    id: Optional[int]
    email: str
    hashed_password: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    google_id: Optional[str] = None
    github_id: Optional[str] = None

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
