import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.shared.database import Base, get_db
from app.main import app as fastapi_app
import app.shared.models

# Shared in-memory SQLite database for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///file:testdb?mode=memory&cache=shared&uri=true"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the FastAPI dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initialize the test database before any tests run."""
    Base.metadata.drop_all(bind=engine) # Ensure clean state
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
