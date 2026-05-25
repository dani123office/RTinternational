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

if __name__ == "__main__":
    add_column()
