"""
Migration: replace old attendance columns with new ones
  Drops: notes, reason
  Adds:  checkout_reason, checkin_reason

Run: python migrate_attendance_columns.py
"""

import os
from sqlalchemy import create_engine, text

DATABASE_URL = (
    os.environ.get("POSTGRES_URL") or
    os.environ.get("DATABASE_URL") or
    "postgresql+pg8000://user:pass@localhost:5432/rtinternational"
)

url = DATABASE_URL
if url.startswith("postgresql://") and "+pg8000" not in url:
    url = url.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(url)

MIGRATE_SQL = """
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='notes') THEN
    ALTER TABLE attendance DROP COLUMN notes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='reason') THEN
    ALTER TABLE attendance DROP COLUMN reason;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='checkout_reason') THEN
    ALTER TABLE attendance ADD COLUMN checkout_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='checkin_reason') THEN
    ALTER TABLE attendance ADD COLUMN checkin_reason TEXT;
  END IF;
END $$;
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
        print("Before:", conn.execute(text(CHECK_SQL)).fetchall())
        print("Running migration...")
        conn.execute(text(MIGRATE_SQL))
        conn.commit()
        print("After:", conn.execute(text(CHECK_SQL)).fetchall())
    print("Done.")
