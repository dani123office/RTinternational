from database import SessionLocal
from models import User, CallBack, Transfer, Customer

db = SessionLocal()
try:
    print("--- USERS ---")
    users = db.query(User).all()
    for u in users:
        print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}, ManagerID: {u.manager_id}")
        
    print("--- CUSTOMERS ---")
    customers = db.query(Customer).order_by(Customer.id.desc()).limit(5).all()
    for c in customers:
        print(f"ID: {c.id}, Name: {c.business_name}, CreatedBy: {c.created_by}")
        
    print("--- TRANSFERS ---")
    transfers = db.query(Transfer).order_by(Transfer.id.desc()).limit(5).all()
    for t in transfers:
        print(f"ID: {t.id}, CustomerID: {t.customer_id}, EmployeeID: {t.employee_id}, CallBackID: {t.call_back_id}")
        
    print("--- CALLBACKS ---")
    callbacks = db.query(CallBack).order_by(CallBack.id.desc()).limit(5).all()
    for cb in callbacks:
        print(f"ID: {cb.id}, CustomerID: {cb.customer_id}, EmployeeID: {cb.employee_id}")
finally:
    db.close()
