import os
import sys

# Ensure the app module is accessible
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.shared.database import engine, Base
from app.shared import models

def init_db():
    print("Initializing database schema (safe single-process mode)...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database schema initialized successfully.")
    except Exception as e:
        print(f"Error initializing database schema: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_db()
