import pytest
import os
# Ensure the test environment is set before importing app modules
os.environ.setdefault("ENVIRONMENT", "testing")

from app.shared.database import Base, engine

# Import all models so their tables are registered with Base.metadata
import app.shared.models
import app.features.authentication.router  # ensures User, RefreshToken etc. are imported

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initialize the test database before any tests run."""
    Base.metadata.drop_all(bind=engine)  # Ensure clean state
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
