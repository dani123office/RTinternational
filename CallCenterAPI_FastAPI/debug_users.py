from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

def debug():
    with engine.connect() as conn:
        print("=== USERS IN DATABASE ===")
        rows = conn.execute(text("SELECT id, name, role, is_active, is_approved, is_deleted FROM users ORDER BY id DESC")).fetchall()
        for r in rows:
            print(r)

if __name__ == '__main__':
    debug()
