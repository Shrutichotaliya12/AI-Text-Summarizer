import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from app.main import app
from app.shared.database import get_db, Base
from app.shared.models import User
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Use StaticPool so all sessions share the SAME in-memory connection
# Without this, each new session gets a blank empty DB
_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

_TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

def _override_get_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Do NOT set app.dependency_overrides at module level — it leaks into other test files
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown():
    """Create all tables before each test, drop after. Set the DB override per-test."""
    # Set the dependency override only for the duration of this test
    app.dependency_overrides[get_db] = _override_get_db
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)
    # Restore the original get_db so other test files are not affected
    app.dependency_overrides.pop(get_db, None)


@patch("app.features.authentication.router.send_real_email")
def test_welcome_email_sent_exactly_once(mock_send_real_email):
    mock_send_real_email.return_value = None

    db = _TestingSessionLocal()
    email = "test_welcome@example.com"
    password = "Password123!"

    # 1. Register
    response = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password
    })
    assert response.status_code == 200
    otp = response.json()["debug_otp"]

    # 2. Verify OTP (triggers welcome email)
    response = client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp": otp,
        "action": "signup"
    })
    assert response.status_code == 200

    # Exactly 2 calls: 1 for signup OTP + 1 for Welcome
    assert mock_send_real_email.call_count == 2

    # 3. Bypass verification state to re-hit the endpoint
    user = db.query(User).filter(User.email == email).first()
    user.is_verified = False
    user.otp_secret = "123456"
    user.otp_expiry = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=5)
    db.commit()

    response = client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp": "123456",
        "action": "signup"
    })
    assert response.status_code == 200

    # Welcome email NOT sent again because welcome_email_sent is True — count stays at 2
    assert mock_send_real_email.call_count == 2

    db.close()


@patch("app.features.authentication.router.send_real_email")
def test_normal_login_sends_no_emails(mock_send_real_email):
    mock_send_real_email.return_value = None

    from app.features.authentication.router import pwd_context
    db = _TestingSessionLocal()
    email = "test_login@example.com"
    valid_hash = pwd_context.hash("Password123!")
    user = User(
        email=email,
        hashed_password=valid_hash,
        is_verified=True,
        welcome_email_sent=True,
    )
    db.add(user)
    db.commit()

    # Wrong password — no email
    response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert mock_send_real_email.call_count == 0

    # Correct password — still no email
    response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert response.status_code == 200
    assert mock_send_real_email.call_count == 0

    db.close()


@patch("app.features.authentication.router.send_real_email")
def test_forgot_password_60_second_cooldown(mock_send_real_email):
    mock_send_real_email.return_value = None

    db = _TestingSessionLocal()
    email = "test_forgot@example.com"

    from app.features.authentication.router import pwd_context
    user = User(
        email=email,
        hashed_password=pwd_context.hash("Password123!"),
        is_verified=True,
    )
    db.add(user)
    db.commit()

    # 1. First forgot-password — should succeed
    response = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert response.status_code == 200
    assert mock_send_real_email.call_count == 1

    # 2. Immediate second request — blocked by 60 s cooldown
    response = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert response.status_code == 400
    assert "Please wait" in response.json()["detail"]
    assert mock_send_real_email.call_count == 1

    # 3. Fast-forward: pretend 61 seconds passed
    user = db.query(User).filter(User.email == email).first()
    user.otp_sent_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=61)
    db.commit()

    # 4. Third request — cooldown over, should succeed
    response = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert response.status_code == 200
    assert mock_send_real_email.call_count == 2

    db.close()
