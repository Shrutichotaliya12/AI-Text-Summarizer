import os
from sqlalchemy import create_engine, text

def migrate():
    from app.infrastructure.config import settings
    db_url = settings.DATABASE_URL
    
    if not db_url:
        db_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(db_dir, "saas_summarizer.db")
        db_url = f"sqlite:///{db_path}"

    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        print("Applying migration to add welcome_email_sent columns...")
        
        # Check dialect
        if engine.dialect.name == "sqlite":
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN welcome_email_sent BOOLEAN DEFAULT 0;"))
                print("Added welcome_email_sent to users (SQLite)")
            except Exception as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding column (SQLite): {e}")
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN welcome_email_sent_at DATETIME;"))
                print("Added welcome_email_sent_at to users (SQLite)")
            except Exception as e:
                if "duplicate column name" not in str(e):
                    print(f"Error adding column (SQLite): {e}")
        elif engine.dialect.name == "postgresql":
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN welcome_email_sent BOOLEAN DEFAULT FALSE;"))
                print("Added welcome_email_sent to users (PostgreSQL)")
            except Exception as e:
                if "duplicate column" not in str(e):
                    print(f"Error adding column (PostgreSQL): {e}")
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN welcome_email_sent_at TIMESTAMP WITHOUT TIME ZONE;"))
                print("Added welcome_email_sent_at to users (PostgreSQL)")
            except Exception as e:
                if "duplicate column" not in str(e):
                    print(f"Error adding column (PostgreSQL): {e}")
                    
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
