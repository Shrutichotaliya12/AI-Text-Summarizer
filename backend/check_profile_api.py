import requests

BASE_URL = "http://127.0.0.1:8001/api/v1"

# 1. Login with an existing admin/verified user
email = "testprofile_blank@test.com"
password = "Password123!"

login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
if login_res.status_code != 200:
    print("Login failed:", login_res.text)
    exit(1)

token = login_res.json()["access_token"]

# 2. Fetch Profile
headers = {"Authorization": f"Bearer {token}"}
prof_res = requests.get(f"{BASE_URL}/auth/profile/full", headers=headers)

print("Status:", prof_res.status_code)
print("Response:", prof_res.text)
