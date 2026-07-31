import time
import secrets
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_weak_password_rejected():
    email = f"weak_pwd_{int(time.time())}@summarizer.pro"
    response = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "simple",
        "name": "Weak Password User"
    })
    assert response.status_code == 400
    assert "Password must be at least 8 characters" in response.json()["detail"]

def test_full_auth_and_refresh_flow():
    email = f"flow_user_{int(time.time())}_{secrets.token_hex(4)}@summarizer.pro"
    password = "StrongPassword123!"
    
    # 1. Register
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "name": "Flow User"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["status"] == "verification_required"
    otp = reg_data["debug_otp"]
    
    # 2. Try login before verify (should fail/request verify)
    login_fail = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_fail.status_code == 403
    assert "Email verification required" in login_fail.json()["detail"]
    
    # 3. Verify OTP
    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp": otp,
        "action": "signup"
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert "access_token" in verify_data
    assert "refresh_token" in verify_data
    
    # Check that HTTP-only cookie was set
    cookies = verify_res.cookies
    assert "refresh_token" in cookies
    initial_cookie_val = cookies["refresh_token"]
    
    # 4. Login after verification
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
        "remember_me": True
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert "refresh_token" in login_data
    
    login_cookie = login_res.cookies.get("refresh_token")
    assert login_cookie is not None
    
    # 5. Token refresh
    refresh_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": login_cookie
    })
    assert refresh_res.status_code == 200
    refresh_data = refresh_res.json()
    assert "access_token" in refresh_data
    assert "refresh_token" in refresh_data
    
    new_refresh_cookie = refresh_res.cookies.get("refresh_token")
    assert new_refresh_cookie is not None
    assert new_refresh_cookie != login_cookie  # Check rotation
    
    # 6. Logout
    logout_res = client.post("/api/v1/auth/logout", cookies={"refresh_token": new_refresh_cookie})
    assert logout_res.status_code == 200
    
    # Verify old token is now invalid/revoked
    refresh_fail = client.post("/api/v1/auth/refresh", json={
        "refresh_token": new_refresh_cookie
    })
    assert refresh_fail.status_code == 401

def test_password_reset_flow():
    email = f"reset_user_{int(time.time())}_{secrets.token_hex(4)}@summarizer.pro"
    password = "OriginalPassword123!"
    
    # Register & Verify
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password
    })
    assert reg_res.status_code == 200
    otp = reg_res.json()["debug_otp"]
    
    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp": otp,
        "action": "signup"
    })
    assert verify_res.status_code == 200
    
    # Forgot password request
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    reset_otp = forgot_res.json()["debug_otp"]
    
    # Reset password
    new_password = "BrandNewPassword999!"
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "email": email,
        "otp": reset_otp,
        "new_password": new_password
    })
    assert reset_res.status_code == 200
    
    # Try login with new password
    login_new = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": new_password
    })
    assert login_new.status_code == 200


def test_phase3_features():
    # Setup test user
    email = f"p3_user_{int(time.time())}_{secrets.token_hex(4)}@summarizer.pro"
    password = "SuperPassword123!"
    
    # 1. Register & Verify to initialize settings/profile
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
    headers = {"Authorization": f"Bearer {access_token}"}

    # 2. Check that signup automatically initialized the Welcome notification
    notifs_res = client.get("/api/v1/notifications/", headers=headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()["notifications"]
    assert len(notifs) > 0
    assert "Welcome" in notifs[0]["text"]
    assert notifs[0]["read"] is False

    # 3. Test mark all read
    read_res = client.post("/api/v1/notifications/mark-all-read", headers=headers)
    assert read_res.status_code == 200
    
    notifs_res2 = client.get("/api/v1/notifications/", headers=headers)
    assert all(n["read"] is True for n in notifs_res2.json()["notifications"])

    # 4. Test clear notifications
    clear_res = client.delete("/api/v1/notifications/", headers=headers)
    assert clear_res.status_code == 200
    
    notifs_res3 = client.get("/api/v1/notifications/", headers=headers)
    assert len(notifs_res3.json()["notifications"]) == 0

    # 5. Check user-scoped history starts empty
    history_res = client.get("/api/v1/history/", headers=headers)
    assert history_res.status_code == 200
    assert len(history_res.json()["history"]) == 0

    # 6. Test UserSettings trash_clear_days updates
    settings_res = client.get("/api/v1/auth/settings", headers=headers)
    assert settings_res.status_code == 200
    assert settings_res.json()["trash_clear_days"] == 30

    update_settings_res = client.post("/api/v1/auth/settings", headers=headers, json={
        "trash_clear_days": 15
    })
    assert update_settings_res.status_code == 200
    
    settings_res2 = client.get("/api/v1/auth/settings", headers=headers)
    assert settings_res2.json()["trash_clear_days"] == 15

