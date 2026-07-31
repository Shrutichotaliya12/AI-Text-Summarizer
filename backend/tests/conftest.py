import pytest
from app.shared.database import Base, engine
import app.shared.models # Ensure all models are registered

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initialize the test database before any tests run."""
    Base.metadata.drop_all(bind=engine) # Ensure clean state
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
