import time
import secrets
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers():
    email = f"testrunner_{int(time.time())}_{secrets.token_hex(4)}@summarizer.pro"
    password = "Password123!"
    
    reg_response = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_response.status_code == 200
    
    reg_data = reg_response.json()
    otp = reg_data["debug_otp"]
    
    verify_response = client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp": otp,
        "action": "signup"
    })
    assert verify_response.status_code == 200
    
    login_response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_read_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "project" in response.json()

def test_get_models_list():
    response = client.get("/api/v1/models/available")
    assert response.status_code == 200
    models = response.json()["models"]
    assert len(models) > 0
    model_ids = [m["id"] for m in models]
    assert "distilbart" in model_ids

def test_summarization_empty_input():
    headers = get_auth_headers()
    payload = {
        "text": "",
        "model_id": "distilbart",
        "min_length": 30,
        "max_length": 150
    }
    response = client.post("/api/v1/summary/summarize", json=payload, headers=headers)
    assert response.status_code == 422

def test_summarization_success():
    headers = get_auth_headers()
    payload = {
        "text": "Artificial intelligence is transforming business models globally. Hugging Face models are open source and widely integrated. NLP tools evaluate document accuracy.",
        "model_id": "distilbart",
        "min_length": 10,
        "max_length": 50
      }
    response = client.post("/api/v1/summary/summarize", json=payload, headers=headers)
    assert response.status_code == 200
    assert "summary" in response.json()
    assert "confidence" in response.json()
    assert response.json()["model_used"] == "distilbart"
