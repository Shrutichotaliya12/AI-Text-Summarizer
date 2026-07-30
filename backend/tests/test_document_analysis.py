import secrets
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def register_and_get_headers(suffix=""):
    """Helper to register and return auth headers for a clean user session."""
    email = f"analysis_user_{int(time.time())}_{secrets.token_hex(4)}{suffix}@docanalysis.com"
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

def test_document_analysis_caching_and_refresh():
    headers = register_and_get_headers("1")
    
    # 1. Upload a text document
    file_content = b"This is a great text document. Python is awesome. We succeed and profit."
    files = {"file": ("nlp_test.txt", file_content, "text/plain")}
    upload_res = client.post("/api/v1/upload/", files=files, headers=headers)
    doc_id = upload_res.json()["id"]
    
    # 2. Query analysis - should compute and cache
    get_res = client.get(f"/api/v1/analysis/{doc_id}", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["document_name"] == "nlp_test.txt"
    assert data["text_statistics"]["totalWords"] == 13
    assert data["readability_scores"]["readingDifficulty"] in ["Very Easy", "Easy", "Fairly Easy", "Standard"]
    assert data["sentiment_emotion"]["sentiment"] == "Positive"
    
    # 3. Request force refresh
    refresh_res = client.post(f"/api/v1/analysis/{doc_id}/refresh", headers=headers)
    assert refresh_res.status_code == 200
    assert refresh_res.json()["status"] == "success"

def test_document_analysis_owner_security():
    headers_owner = register_and_get_headers("owner")
    headers_other = register_and_get_headers("other")
    
    # 1. Owner uploads a file
    files = {"file": ("secret.txt", b"Top secret calculations inside.", "text/plain")}
    upload_res = client.post("/api/v1/upload/", files=files, headers=headers_owner)
    doc_id = upload_res.json()["id"]
    
    # 2. Other user tries to access owner's document analysis - should raise 404
    other_res = client.get(f"/api/v1/analysis/{doc_id}", headers=headers_other)
    assert other_res.status_code == 404
    
    # 3. Other user tries to force refresh owner's document analysis - should raise 404
    other_refresh = client.post(f"/api/v1/analysis/{doc_id}/refresh", headers=headers_other)
    assert other_refresh.status_code == 404

def test_document_analysis_exports():
    headers = register_and_get_headers("export")
    
    # 1. Upload file
    files = {"file": ("export_me.txt", b"Linguistics analysis testing.", "text/plain")}
    upload_res = client.post("/api/v1/upload/", files=files, headers=headers)
    doc_id = upload_res.json()["id"]
    
    # Trigger calculation first
    client.get(f"/api/v1/analysis/{doc_id}", headers=headers)
    
    # 2. Test JSON export
    res_json = client.get(f"/api/v1/analysis/{doc_id}/export?format=json", headers=headers)
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers["Content-Type"]
    
    # 3. Test CSV export
    res_csv = client.get(f"/api/v1/analysis/{doc_id}/export?format=csv", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["Content-Type"]
    
    # 4. Test TXT export
    res_txt = client.get(f"/api/v1/analysis/{doc_id}/export?format=txt", headers=headers)
    assert res_txt.status_code == 200
    assert "text/plain" in res_txt.headers["Content-Type"]
