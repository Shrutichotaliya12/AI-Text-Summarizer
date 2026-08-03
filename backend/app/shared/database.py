import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.infrastructure.config import settings

db_url = settings.DATABASE_URL

if settings.ENVIRONMENT == "testing":
    if not db_url:
        db_url = "sqlite:///./test.db"
elif settings.ENVIRONMENT == "development" or not db_url or "postgresql" not in db_url:
    db_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(db_dir, "saas_summarizer.db")
    db_url = f"sqlite:///{db_path}"

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        # SQLite pool settings — single writer with queue
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_pre_ping=True,
    )
else:
    # PostgreSQL production pool — sustains concurrent connections
    engine = create_engine(
        db_url,
        pool_size=10,        # Keep 10 connections warm
        max_overflow=20,     # Allow burst up to 30 total
        pool_timeout=30,     # Wait max 30s for a connection
        pool_recycle=1800,   # Recycle connections every 30 mins (avoids stale TCP)
        pool_pre_ping=True,  # Validate connection before use
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database initialization moved to main.py after models are loaded
