"""
migrate_production.py — Idempotent column-level migration.

Rules:
  - Uses IF NOT EXISTS (PostgreSQL 9.6+) so it is completely safe to run
    on every deploy, even if the columns already exist.
  - Never drops tables, drops columns, or deletes rows.
  - Works on both PostgreSQL (production) and SQLite (local dev/tests).
  - Called automatically by startup.py before uvicorn starts.
"""
import os
import sys
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

log = logging.getLogger("migrate_production")

def migrate():
    from app.infrastructure.config import settings
    from sqlalchemy import create_engine, text

    db_url = settings.DATABASE_URL

    if not db_url:
        db_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(db_dir, "saas_summarizer.db")
        db_url = f"sqlite:///{db_path}"

    log.info(f"Connecting to DB dialect: {db_url.split('://')[0]}")
    engine = create_engine(db_url)

    with engine.begin() as conn:   # begin() auto-commits on exit / rolls back on error
        dialect = engine.dialect.name
        log.info(f"DB dialect detected: {dialect}")

        if dialect == "postgresql":
            _migrate_postgresql(conn)
        elif dialect == "sqlite":
            _migrate_sqlite(conn)
        else:
            log.warning(f"Unknown dialect '{dialect}' — skipping migration.")

    log.info("Migration finished successfully.")


def _migrate_postgresql(conn):
    """PostgreSQL: use IF NOT EXISTS — fully idempotent."""
    from sqlalchemy import text

    migrations = [
        (
            "welcome_email_sent",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;"
        ),
        (
            "welcome_email_sent_at",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP WITHOUT TIME ZONE;"
        ),
    ]

    for col_name, sql in migrations:
        try:
            conn.execute(text(sql))
            log.info(f"PostgreSQL: column '{col_name}' ensured.")
        except Exception as exc:
            # Treat all errors as warnings — column might already exist in older PG versions
            log.warning(f"PostgreSQL: skipped '{col_name}': {exc}")


def _migrate_sqlite(conn):
    """SQLite: no IF NOT EXISTS support — catch 'duplicate column name' gracefully."""
    from sqlalchemy import text

    migrations = [
        (
            "welcome_email_sent",
            "ALTER TABLE users ADD COLUMN welcome_email_sent BOOLEAN DEFAULT 0;"
        ),
        (
            "welcome_email_sent_at",
            "ALTER TABLE users ADD COLUMN welcome_email_sent_at DATETIME;"
        ),
    ]

    for col_name, sql in migrations:
        try:
            conn.execute(text(sql))
            log.info(f"SQLite: column '{col_name}' added.")
        except Exception as exc:
            err = str(exc).lower()
            if "duplicate column name" in err or "already exists" in err:
                log.info(f"SQLite: column '{col_name}' already exists — skipping.")
            else:
                # Unexpected error — re-raise so startup.py catches it
                raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    migrate()
