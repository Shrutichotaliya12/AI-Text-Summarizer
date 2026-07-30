import secrets
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def register_and_get_headers(suffix=""):
    """Helper to register and return auth headers for a clean user session."""
    email = f"perf_user_{int(time.time())}_{secrets.token_hex(4)}{suffix}@docperf.com"
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

def test_performance_analytics_overview():
    headers = register_and_get_headers("1")
    
    # 1. Fetch performance stats - empty database values first
    res = client.get("/api/v1/analytics/performance", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "overview" in data
    assert "systemHealth" in data
    assert data["overview"]["totalDocuments"] == 0
    assert data["overview"]["totalSummaries"] == 0
    
    # 2. Upload one document to check counter increments
    files = {"file": ("perf_metric_test.txt", b"Document size validation.", "text/plain")}
    upload_res = client.post("/api/v1/upload/", files=files, headers=headers)
    assert upload_res.status_code == 200
    
    res2 = client.get("/api/v1/analytics/performance", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["overview"]["totalDocuments"] == 1

def test_performance_scoping():
    headers_user1 = register_and_get_headers("user1")
    headers_user2 = register_and_get_headers("user2")
    
    # User 1 uploads document
    client.post("/api/v1/upload/", files={"file": ("u1.txt", b"User 1 content.", "text/plain")}, headers=headers_user1)
    
    # User 2 checks performance stats - should NOT see User 1's document
    res = client.get("/api/v1/analytics/performance", headers=headers_user2)
    assert res.status_code == 200
    assert res.json()["overview"]["totalDocuments"] == 0
    
    # User 1 checks performance stats - should see 1 document
    res_u1 = client.get("/api/v1/analytics/performance", headers=headers_user1)
    assert res_u1.json()["overview"]["totalDocuments"] == 1

def test_performance_export_endpoints():
    headers = register_and_get_headers("export")
    
    # Test JSON export format
    res_json = client.get("/api/v1/analytics/performance/export?format=json", headers=headers)
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers["Content-Type"]
    
    # Test CSV export format
    res_csv = client.get("/api/v1/analytics/performance/export?format=csv", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["Content-Type"]
