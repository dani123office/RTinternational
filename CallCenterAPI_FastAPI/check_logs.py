from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        print("=== RECENT ACTIVITY LOGS FOR LOANS / AHSAN ===")
        logs = conn.execute(text("SELECT id, user_id, action, entity_type, entity_id, description, created_at FROM activity_logs WHERE entity_type = 'loan' OR description ILIKE '%loan%' OR description ILIKE '%ahsan%' ORDER BY id DESC LIMIT 20")).fetchall()
        for l in logs:
            print(l)

if __name__ == '__main__':
    check()
