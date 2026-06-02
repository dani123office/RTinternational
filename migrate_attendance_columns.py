"""
One-time migration: rename attendance columns
  notes  -> checkout_reason
  reason -> checkin_reason

Run: python migrate_attendance_columns.py
"""

import os
from sqlalchemy import create_engine, text

DATABASE_URL = (
    os.environ.get("POSTGRES_URL") or
    os.environ.get("DATABASE_URL") or
    "postgresql+pg8000://user:pass@localhost:5432/rtinternational"
)

# pg8000 needs +pg8000 driver
url = DATABASE_URL
if url.startswith("postgresql://") and "+pg8000" not in url:
    url = url.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(url)

RENAME_SQL = """
ALTER TABLE attendance
  RENAME COLUMN notes TO checkout_reason;
ALTER TABLE attendance
  RENAME COLUMN reason TO checkin_reason;
"""

CHECK_SQL = """
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendance'
  AND column_name IN ('notes', 'reason', 'checkout_reason', 'checkin_reason')
ORDER BY ordinal_position;
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        print("Current columns:", conn.execute(text(CHECK_SQL)).fetchall())
        print("Running migration...")
        conn.execute(text(RENAME_SQL))
        conn.commit()
        print("After migration:", conn.execute(text(CHECK_SQL)).fetchall())
    print("Done.")
