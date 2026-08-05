"""
startup.py — Runs before uvicorn on every Render deploy.

Order of operations:
  1. migrate_production.py  → safely ADD new columns (idempotent, no DROP)
  2. init_db.py             → create_all() for any brand-new tables
  3. uvicorn starts

Safe to run with multiple workers because:
  - ALTER TABLE … ADD COLUMN IF NOT EXISTS is idempotent on PostgreSQL
  - create_all() is a no-op for already-existing tables
  - Migration errors for "column already exists" are swallowed, not fatal
"""
import os
import sys

# Make sure the app package is importable from /app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("startup")

# ── Step 1: run schema migration ──────────────────────────────────────────────
log.info("=== STEP 1: Running database migration ===")
try:
    from migrate_production import migrate
    migrate()
    log.info("Migration complete.")
except Exception as exc:
    # Non-fatal: if the DB isn't up yet Render will restart the container
    log.error(f"Migration raised an exception: {exc}")
    sys.exit(1)

# ── Step 2: create any new tables (idempotent) ────────────────────────────────
log.info("=== STEP 2: Initialising database schema ===")
try:
    from init_db import init_db
    init_db()
    log.info("Schema initialisation complete.")
except Exception as exc:
    log.error(f"Schema init raised an exception: {exc}")
    sys.exit(1)

log.info("=== Startup tasks complete — handing off to uvicorn ===")
