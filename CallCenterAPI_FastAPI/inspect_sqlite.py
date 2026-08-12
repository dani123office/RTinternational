import sqlite3
import os

CANDIDATE_PATHS = [
    "/app/data/callcenter.db",
    "/app/rt-international/data/callcenter.db",
    "callcenter.db",
    "CallCenterAPI_FastAPI/callcenter.db"
]

def inspect():
    found_path = None
    for p in CANDIDATE_PATHS:
        if os.path.exists(p):
            found_path = p
            break
            
    if not found_path:
        print("No SQLite DB found in candidate paths!")
        return

    conn = sqlite3.connect(found_path)
    cursor = conn.cursor()
    print(f"=== INSPECTING SQLITE DATABASE {found_path} ===")
    
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
