from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("UPDATE users SET is_approved = TRUE WHERE is_active = TRUE;"))
        conn.commit()
        print("Migration for is_approved column completed successfully!")

if __name__ == "__main__":
    run_migration()
