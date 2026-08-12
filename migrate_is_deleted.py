import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from CallCenterAPI_FastAPI.database import engine

def run_migration():
    print("Running migration for is_deleted column...")
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.commit()
        print("Migration for is_deleted column completed successfully!")

if __name__ == '__main__':
    run_migration()
