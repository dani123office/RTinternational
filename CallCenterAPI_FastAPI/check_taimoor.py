from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        print("=== SEARCH FOR TAIMOOR / TAHMOOR IN USERS ===")
        res = conn.execute(text("SELECT id, name, email, role, is_active, is_approved, created_at FROM users WHERE LOWER(name) LIKE '%taimoor%' OR LOWER(email) LIKE '%taimoor%' OR LOWER(name) LIKE '%tahmoor%' OR LOWER(email) LIKE '%tahmoor%'")).fetchall()
        print("Users matching Taimoor/Tahmoor:", res)

        print("\n=== ALL USERS IN DB ===")
        all_u = conn.execute(text("SELECT id, name, email, role, is_active, is_approved, created_at FROM users ORDER BY id DESC")).fetchall()
        for u in all_u:
            print(u)

        print("\n=== CHECK ORPHAN / UNLINKED RECORDS ===")
        callbacks = conn.execute(text("SELECT id, employee_id, customer_id, created_at FROM callbacks WHERE employee_id NOT IN (SELECT id FROM users)")).fetchall()
        print("Unlinked callbacks:", callbacks)

        transfers = conn.execute(text("SELECT id, employee_id, customer_id, created_at FROM transfers WHERE employee_id NOT IN (SELECT id FROM users)")).fetchall()
        print("Unlinked transfers:", transfers)

        sales = conn.execute(text("SELECT id, employee_id, customer_id, created_at FROM sales WHERE employee_id NOT IN (SELECT id FROM users)")).fetchall()
        print("Unlinked sales:", sales)

if __name__ == '__main__':
    check()
