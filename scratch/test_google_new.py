import sys
sys.path.append('backend')

from sqlalchemy.orm import Session
from app.shared.database import SessionLocal
from app.shared.models import User, Profile, UserSettings
from app.features.authentication.router import google_oauth, OAuthPayload

def test_route():
    db = SessionLocal()
    # Delete test user if it exists to simulate a fresh registration
    u = db.query(User).filter(User.email == "new_google_user@test.com").first()
    if u:
        db.delete(u)
        db.commit()
        
    try:
        payload = OAuthPayload(token="real_token_123")
        
        import app.features.authentication.router as router_mod
        
        def mock_verify(token):
            return "new_google_user@test.com", "New Google User", "https://lh3.googleusercontent.com/avatar"
            
        router_mod.verify_google_id_token = mock_verify
        
        print("Calling google_oauth for a NEW user registration...")
        res = google_oauth(payload, db)
        print("Result:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        # Clean up
        u = db.query(User).filter(User.email == "new_google_user@test.com").first()
        if u:
            db.delete(u)
            db.commit()
        db.close()

if __name__ == "__main__":
    test_route()
