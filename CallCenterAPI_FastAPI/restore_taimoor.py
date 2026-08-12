import re
import os
from CallCenterAPI_FastAPI.database import engine
from sqlalchemy import text

BACKUP_FILE = "/app/neon_database_backup.sql"

def restore():
    if not os.path.exists(BACKUP_FILE):
        print(f"Backup file {BACKUP_FILE} not found!")
        return

    print("=== READING BACKUP FILE FOR TAIMOOR (USER ID 121) ===")
    with open(BACKUP_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

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

        if "INSERT INTO transfers" in line and "(", " 121," in line:
            m = re.search(r"VALUES \((\d+),\s*121,\s*(\d+)", line)
            if m:
                target_customer_ids.add(int(m.group(2)))

        if "INSERT INTO sales" in line and "(", " 121," in line:
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

    with engine.connect() as conn:
        # Check if user 121 exists or user 156 exists
        existing_121 = conn.execute(text("SELECT id FROM users WHERE id = 121")).fetchone()
        if not existing_121:
            print("Restoring User 121 (Taimoor)...")
            for stmt in user_statements:
                conn.execute(text(stmt))
            conn.commit()

        # Set user 121 active & approved
        conn.execute(text("UPDATE users SET is_active = TRUE, is_approved = TRUE, is_deleted = FALSE WHERE id = 121"))
        conn.commit()

        # Restore Customers
        for stmt in customer_statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print("Customer restore note:", e)
        conn.commit()

        # Restore Meters
        for stmt in meter_statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print("Meter restore note:", e)
        conn.commit()

        # Restore Transfers
        for stmt in transfer_statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print("Transfer restore note:", e)
        conn.commit()

        # Restore Callbacks
        for stmt in callback_statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print("Callback restore note:", e)
        conn.commit()

        # Restore Sales
        for stmt in sale_statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print("Sale restore note:", e)
        conn.commit()

        # Restore Attendance
        for stmt in attendance_statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print("Attendance restore note:", e)
        conn.commit()

        # Verify restored totals
        sales_cnt = conn.execute(text("SELECT COUNT(*) FROM sales WHERE employee_id = 121")).scalar()
        trans_cnt = conn.execute(text("SELECT COUNT(*) FROM transfers WHERE employee_id = 121")).scalar()
        call_cnt = conn.execute(text("SELECT COUNT(*) FROM callbacks WHERE employee_id = 121")).scalar()
        print(f"\n=== RESTORATION COMPLETE FOR TAIMOOR (ID 121) ===")
        print(f"Restored Sales: {sales_cnt}")
        print(f"Restored Transfers: {trans_cnt}")
        print(f"Restored Callbacks: {call_cnt}")

if __name__ == '__main__':
    restore()
