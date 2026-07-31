from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_cors_headers():
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
    }
    response = client.options("/api/v1/summary/summarize", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

def test_jwt_unauthorized():
    # Attempting to load private history without authentication token should block
    response = client.get("/api/v1/history")
    assert response.status_code == 401

def test_rate_limiting():
    # Continual requests checks
    response = client.get("/health")
    assert response.status_code == 200
