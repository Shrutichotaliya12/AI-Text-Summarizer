import secrets
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def register_and_get_headers():
    """Helper to register and return auth headers for a clean user session."""
    email = f"doc_user_{int(time.time())}_{secrets.token_hex(4)}@docmgmt.com"
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

def test_document_upload_success():
    headers = register_and_get_headers()
    
    # 1. Upload normal TXT file
    file_content = b"This is a test plain text document containing exactly ten words."
    files = {"file": ("test_doc.txt", file_content, "text/plain")}
    response = client.post("/api/v1/upload/", files=files, headers=headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["filename"] == "test_doc.txt"
    assert res_data["word_count"] == 11
    
    # 2. Check document is listed in library
    list_res = client.get("/api/v1/upload/", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()["documents"]
    assert len(docs) == 1
    assert docs[0]["name"] == "test_doc.txt"

def test_document_upload_validations():
    headers = register_and_get_headers()
    
    # 1. Test empty file validation
    files_empty = {"file": ("empty.txt", b"", "text/plain")}
    response_empty = client.post("/api/v1/upload/", files=files_empty, headers=headers)
    assert response_empty.status_code == 400
    assert "empty" in response_empty.json()["detail"]

    # 2. Test duplicate upload validation
    content = b"This is some standard content that we want to try uploading twice."
    files_1 = {"file": ("dupe_test.txt", content, "text/plain")}
    res1 = client.post("/api/v1/upload/", files=files_1, headers=headers)
    assert res1.status_code == 200
    
    files_2 = {"file": ("dupe_test.txt", content, "text/plain")}
    res2 = client.post("/api/v1/upload/", files=files_2, headers=headers)
    assert res2.status_code == 400
    assert "already been uploaded" in res2.json()["detail"]

def test_document_download():
    headers = register_and_get_headers()
    file_content = b"Content to test download functionality."
    files = {"file": ("download.txt", file_content, "text/plain")}
    
    upload_res = client.post("/api/v1/upload/", files=files, headers=headers)
    doc_id = upload_res.json()["id"]
    
    download_res = client.get(f"/api/v1/upload/{doc_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert download_res.content == file_content
    assert "download.txt" in download_res.headers.get("Content-Disposition", "")

def test_document_update_metadata():
    headers = register_and_get_headers()
    files = {"file": ("metadata.txt", b"Extracted text content.", "text/plain")}
    upload_res = client.post("/api/v1/upload/", files=files, headers=headers)
    doc_id = upload_res.json()["id"]
    
    # Update notes, display name and tags
    update_res = client.put(f"/api/v1/upload/{doc_id}", json={
        "display_name": "Fancy Name.txt",
        "notes": "Important reference guide.",
        "tags": "reference,guide"
    }, headers=headers)
    assert update_res.status_code == 200
    
    # Verify in library listing
    list_res = client.get("/api/v1/upload/", headers=headers)
    doc = list_res.json()["documents"][0]
    assert doc["display_name"] == "Fancy Name.txt"
    assert doc["notes"] == "Important reference guide."
    assert "reference" in doc["tags"]

def test_document_soft_delete_and_trash():
    headers = register_and_get_headers()
    files = {"file": ("trash.txt", b"Some random garbage content.", "text/plain")}
    upload_res = client.post("/api/v1/upload/", files=files, headers=headers)
    doc_id = upload_res.json()["id"]
    
    # 1. Soft delete document
    del_res = client.delete(f"/api/v1/upload/{doc_id}", headers=headers)
    assert del_res.status_code == 200
    
    # 2. Document must not show in active library listing
    list_active = client.get("/api/v1/upload/", headers=headers)
    assert len(list_active.json()["documents"]) == 0
    
    # 3. Document must show in trash listing
    list_trash = client.get("/api/v1/upload/trash", headers=headers)
    assert len(list_trash.json()["documents"]) == 1
    assert list_trash.json()["documents"][0]["id"] == doc_id
    
    # 4. Restore document
    restore_res = client.post(f"/api/v1/upload/{doc_id}/restore", headers=headers)
    assert restore_res.status_code == 200
    
    # 5. Check document is back in library
    list_active2 = client.get("/api/v1/upload/", headers=headers)
    assert len(list_active2.json()["documents"]) == 1
