import sqlite3
import os

DB_PATH = "/app/rt-international/data/callcenter.db"

def inspect():
    if not os.path.exists(DB_PATH):
        print(f"SQLite DB {DB_PATH} not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print(f"=== INSPECTING SQLITE DATABASE {DB_PATH} ===")
    
    # get all table names
    tables = [t[0] for t in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    print("Tables:", tables)

    for t in ["users", "sales", "transfers", "callbacks", "customers", "loan_requests", "leave_requests", "attendance"]:
        if t in tables:
            try:
                cnt = cursor.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                max_date = cursor.execute(f"SELECT MAX(created_at) FROM {t}").fetchone()[0]
                print(f"Table {t.upper()}: Count = {cnt}, Max Date = {max_date}")
            except Exception as e:
                print(f"Table {t.upper()}: Error {e}")

if __name__ == '__main__':
    inspect()
