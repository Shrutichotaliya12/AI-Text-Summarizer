from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime

@dataclass
class Document:
    id: Optional[int]
    title: str
    content: str
    word_count: int
    char_count: int
    user_id: int
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content[:200] + "..." if len(self.content) > 200 else self.content,
            "word_count": self.word_count,
            "char_count": self.char_count,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "metadata": self.metadata
        }
