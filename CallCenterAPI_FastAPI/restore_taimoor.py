import sys
import re
import os
from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

CANDIDATE_PATHS = [
    "/app/neon_database_backup.sql",
    "/app/rt-international/neon_database_backup.sql",
    "neon_database_backup.sql",
    "../neon_database_backup.sql"
]

def restore():
    lines = []
    found_path = None
    for p in CANDIDATE_PATHS:
        if os.path.exists(p):
            found_path = p
            break
    
    if found_path:
        print(f"=== READING BACKUP FILE {found_path} FOR TAIMOOR (USER ID 121) ===")
        with open(found_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    else:
        print("=== READING BACKUP FROM STDIN FOR TAIMOOR (USER ID 121) ===")
        lines = sys.stdin.readlines()

    user_statements = []
    customer_statements = []
    transfer_statements = []
    callback_statements = []
    sale_statements = []
    meter_statements = []
    attendance_statements = []

    # First collect user 121
    for line in lines:
        if "INSERT INTO users" in line and "(121," in line:
            user_statements.append(line.strip())

    # Find customer IDs linked to user 121
    target_customer_ids = set()
    for line in lines:
        if "INSERT INTO customers" in line and ", 121," in line:
            customer_statements.append(line.strip())
            # extract customer ID
            m = re.search(r"VALUES \((\d+),", line)
            if m:
                target_customer_ids.add(int(m.group(1)))

        if "INSERT INTO transfers" in line and ", 121," in line:
            m = re.search(r"VALUES \((\d+),\s*121,\s*(\d+)", line)
            if m:
                target_customer_ids.add(int(m.group(2)))

        if "INSERT INTO sales" in line and ", 121," in line:
            m = re.search(r"VALUES \((\d+),\s*121,\s*(\d+)", line)
            if m:
                target_customer_ids.add(int(m.group(2)))

    # Collect transfers, callbacks, sales for employee_id = 121
    for line in lines:
        if "INSERT INTO transfers" in line and ", 121," in line:
            transfer_statements.append(line.strip())
        elif "INSERT INTO callbacks" in line and ", 121," in line:
            callback_statements.append(line.strip())
        elif "INSERT INTO sales" in line and ", 121," in line:
            sale_statements.append(line.strip())
        elif "INSERT INTO attendance" in line and ", 121," in line:
            attendance_statements.append(line.strip())

    # Collect customers linked to sales/transfers/callbacks if not already in customer_statements
    for line in lines:
        if "INSERT INTO customers" in line:
            m = re.search(r"VALUES \((\d+),", line)
            if m and int(m.group(1)) in target_customer_ids:
                if line.strip() not in customer_statements:
                    customer_statements.append(line.strip())

    # Collect electricity_meters & gas_meters for target_customer_ids
    for line in lines:
        if "INSERT INTO electricity_meters" in line or "INSERT INTO gas_meters" in line:
            for cid in target_customer_ids:
                if f", {cid}," in line or f", {cid})" in line:
                    meter_statements.append(line.strip())
                    break

    print(f"Found {len(user_statements)} user statement")
    print(f"Found {len(customer_statements)} customer statements (IDs: {target_customer_ids})")
    print(f"Found {len(transfer_statements)} transfer statements")
    print(f"Found {len(callback_statements)} callback statements")
    print(f"Found {len(sale_statements)} sale statements")
    print(f"Found {len(meter_statements)} meter statements")
    print(f"Found {len(attendance_statements)} attendance statements")

    def exec_sql(stmt):
        try:
            with engine.connect() as conn:
                conn.execute(text(stmt))
                conn.commit()
        except Exception as e:
            err_msg = str(e).split("\n")[0]
            print(f"Note: {err_msg}")

    # Restore User 121
    with engine.connect() as conn:
        existing_121 = conn.execute(text("SELECT id FROM users WHERE id = 121")).fetchone()
        if not existing_121:
            print("Restoring User 121 (Taimoor)...")
            for stmt in user_statements:
                exec_sql(stmt)

        conn.execute(text("UPDATE users SET is_active = TRUE, is_approved = TRUE, is_deleted = FALSE WHERE id = 121"))
        conn.commit()

    print("Restoring Customers...")
    for stmt in customer_statements:
        exec_sql(stmt)

    print("Restoring Meters...")
    for stmt in meter_statements:
        exec_sql(stmt)

    print("Restoring Transfers...")
    for stmt in transfer_statements:
        exec_sql(stmt)

    print("Restoring Callbacks...")
    for stmt in callback_statements:
        exec_sql(stmt)

    print("Restoring Sales...")
    for stmt in sale_statements:
        exec_sql(stmt)

    print("Restoring Attendance...")
    for stmt in attendance_statements:
        exec_sql(stmt)

        # Verify restored totals
        with engine.connect() as conn:
            sales_cnt = conn.execute(text("SELECT COUNT(*) FROM sales WHERE employee_id = 121")).scalar()
            trans_cnt = conn.execute(text("SELECT COUNT(*) FROM transfers WHERE employee_id = 121")).scalar()
            call_cnt = conn.execute(text("SELECT COUNT(*) FROM callbacks WHERE employee_id = 121")).scalar()
        print(f"\n=== RESTORATION COMPLETE FOR TAIMOOR (ID 121) ===")
        print(f"Restored Sales: {sales_cnt}")
        print(f"Restored Transfers: {trans_cnt}")
        print(f"Restored Callbacks: {call_cnt}")

if __name__ == '__main__':
    restore()
