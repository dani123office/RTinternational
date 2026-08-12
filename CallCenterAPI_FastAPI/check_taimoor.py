from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        print("=== SEARCH FOR TAIMOOR / TAHMOOR IN USERS ===")
        res = conn.execute(text("SELECT id, name, email, role, manager_id, is_active, is_approved, created_at FROM users WHERE id=156 OR LOWER(name) LIKE '%taimoor%' OR LOWER(email) LIKE '%taimoor%'")).fetchall()
        print("Taimoor user record:", res)

        print("\n=== TAIMOOR LINKED DATA ===")
        cb_count = conn.execute(text("SELECT COUNT(*) FROM callbacks WHERE employee_id=156")).scalar()
        tr_count = conn.execute(text("SELECT COUNT(*) FROM transfers WHERE employee_id=156")).scalar()
        sa_count = conn.execute(text("SELECT COUNT(*) FROM sales WHERE employee_id=156")).scalar()
        cu_count = conn.execute(text("SELECT COUNT(*) FROM customers WHERE created_by=156")).scalar()
        print(f"Callbacks: {cb_count}, Transfers: {tr_count}, Sales: {sa_count}, Customers: {cu_count}")

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
