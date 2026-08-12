from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        print("=== MAX CREATED_AT DATES IN LIVE DATABASE ===")
        tables = ["users", "sales", "transfers", "callbacks", "customers", "loan_requests", "leave_requests", "attendance"]
        for t in tables:
            try:
                res = conn.execute(text(f"SELECT MAX(created_at), COUNT(*) FROM {t}")).fetchone()
                print(f"Table {t.upper()}: Max Date = {res[0]}, Count = {res[1]}")
            except Exception as e:
                print(f"Table {t.upper()}: Error {e}")

if __name__ == '__main__':
    check()
