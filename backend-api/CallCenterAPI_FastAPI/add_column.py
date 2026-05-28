from database import engine, Base
from sqlalchemy import text, inspect

def add_column():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('call_backs')]
    
    if 'not_interested_reason' not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE call_backs ADD not_interested_reason TEXT NULL"))
            conn.commit()
            print("Column 'not_interested_reason' added to call_backs table")
    else:
        print("Column 'not_interested_reason' already exists")
    
    if 'account_number' not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE call_backs ADD account_number VARCHAR(50) NULL"))
            conn.commit()
            print("Column 'account_number' added to call_backs table")
    else:
        print("Column 'account_number' already exists")
    
    if 'mpan' not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE call_backs ADD mpan VARCHAR(50) NULL"))
            conn.commit()
            print("Column 'mpan' added to call_backs table")
    else:
        print("Column 'mpan' already exists")
    
    if 'mprn' not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE call_backs ADD mprn VARCHAR(50) NULL"))
            conn.commit()
            print("Column 'mprn' added to call_backs table")
    else:
        print("Column 'mprn' already exists")
    
    if 'msn' not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE call_backs ADD msn VARCHAR(50) NULL"))
            conn.commit()
            print("Column 'msn' added to call_backs table")
    else:
        print("Column 'msn' already exists")

if __name__ == "__main__":
    add_column()
