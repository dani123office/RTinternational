from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        print("=== LOAN REQUESTS IN DATABASE ===")
        loans = conn.execute(text("SELECT id, user_id, amount, status, reason, created_at FROM loan_requests ORDER BY id DESC")).fetchall()
        print("Total loan requests:", len(loans))
        for l in loans:
            print(l)

        print("\n=== LEAVE REQUESTS IN DATABASE ===")
        leaves = conn.execute(text("SELECT id, user_id, leave_type, status, reason, created_at FROM leave_requests ORDER BY id DESC")).fetchall()
        print("Total leave requests:", len(leaves))
        for lv in leaves:
            print(lv)

        print("\n=== M AHSAN SHAHID USER ID ===")
        u = conn.execute(text("SELECT id, name, email, role, is_active, is_approved, is_deleted FROM users WHERE name ILIKE '%ahsan%'")).fetchall()
        print(u)

if __name__ == '__main__':
    check()
