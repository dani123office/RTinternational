from database import SessionLocal
from models import User

db = SessionLocal()
try:
    usman = db.query(User).filter(User.name == "Usman").first()
    sarah = db.query(User).filter(User.name == "Sarah").first()
    if usman and sarah:
        usman.manager_id = sarah.id
        db.commit()
        print("Restored Usman's manager to Sarah")
    else:
        print("Could not find Usman or Sarah")
finally:
    db.close()
