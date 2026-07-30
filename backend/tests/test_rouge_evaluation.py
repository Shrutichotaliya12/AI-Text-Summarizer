import secrets
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def register_and_get_headers(suffix=""):
    """Helper to register and return auth headers for a clean user session."""
    email = f"rouge_user_{int(time.time())}_{secrets.token_hex(4)}{suffix}@docrouge.com"
    password = "SuperPassword123!"
    
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password
    })
    otp = reg_res.json()["debug_otp"]
    
    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp": otp,
        "action": "signup"
    })
    access_token = verify_res.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}

def test_rouge_evaluation_caching_and_scores():
    headers = register_and_get_headers("1")
    
    # 1. Run evaluation
    cand = "Artificial intelligence is transforming business models globally. Hugging Face models are widely integrated."
    ref = "Artificial intelligence is transforming business models. Hugging Face models are widely integrated."
    
    res = client.post("/api/v1/rouge/evaluate", json={
        "candidate": cand,
        "reference": ref,
        "model_used": "distilbart"
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["scores"]["rouge1"] > 0
    assert data["scores"]["qualityLabel"] in ["Excellent", "Very Good", "Good", "Average", "Needs Improvement"]
    
    # 2. Check cached retrieval works instantly
    res2 = client.post("/api/v1/rouge/evaluate", json={
        "candidate": cand,
        "reference": ref,
        "model_used": "distilbart"
    }, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["id"] == data["id"]

def test_rouge_history_and_deletion():
    headers = register_and_get_headers("history")
    
    cand = "This is a simple candidate sentence."
    ref = "This is a simple reference sentence."
    
    # Create evaluation
    client.post("/api/v1/rouge/evaluate", json={
        "candidate": cand,
        "reference": ref,
        "model_used": "pegasus"
    }, headers=headers)
    
    # Query history
    history_res = client.get("/api/v1/rouge/history?search=candidate", headers=headers)
    assert history_res.status_code == 200
    items = history_res.json()["evaluations"]
    assert len(items) == 1
    eval_id = items[0]["id"]
    
    # Delete report
    del_res = client.delete(f"/api/v1/rouge/{eval_id}", headers=headers)
    assert del_res.status_code == 200
    
    # Query history again
    history_res2 = client.get("/api/v1/rouge/history", headers=headers)
    assert len(history_res2.json()["evaluations"]) == 0

def test_rouge_owner_security():
    headers_owner = register_and_get_headers("owner")
    headers_other = register_and_get_headers("other")
    
    # Owner evaluates a summary
    res = client.post("/api/v1/rouge/evaluate", json={
        "candidate": "Owner summary text",
        "reference": "Ground truth text",
        "model_used": "gpt_4"
    }, headers=headers_owner)
    eval_id = res.json()["id"]
    
    # Other user tries to access report download - should return 404
    other_res = client.get(f"/api/v1/rouge/{eval_id}/export?format=json", headers=headers_other)
    assert other_res.status_code == 404
    
    # Other user tries to delete report - should return 404
    other_del = client.delete(f"/api/v1/rouge/{eval_id}", headers=headers_other)
    assert other_del.status_code == 404
