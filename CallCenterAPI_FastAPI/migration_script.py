import re
from database import SessionLocal
from models import User, Customer, CallBack, Transfer, Sale

def parse_customer_concatenated(text):
    if not text:
        return None
    # match e.g. "Business 1000Owner 10000123456789SW1A..."
    pattern = r"(Business\s+\d+)(Owner\s+\d+)(\d{10,})([A-Z0-9\s]+)"
    m = re.match(pattern, text)
    if m:
        return m.group(1), m.group(2), m.group(3), m.group(4).strip()
    return None

def parse_concatenated_notes(text):
    if not text:
        return None
        
    utility = None
    for u in ["electricity", "gas", "both"]:
        if text.lower().startswith(u):
            utility = u
            text = text[len(u):]
            break
            
    status = None
    for s in ["pending", "done", "overdue", "cancelled", "not_interested", "in_progress", "sale_complete", "chasing", "approved", "rejected", "dispute", "completed", "failed", "cotinprogress", "hold"]:
        if text.lower().startswith(s):
            status = s
            text = text[len(s):]
            break
            
    supplier = None
    suppliers = ["British Gas", "SSE", "E.ON", "EDF", "Npower", "Scottish Power", "Bulb", "Octopus"]
    for sup in suppliers:
        if text.lower().startswith(sup.lower()):
            supplier = sup
            text = text[len(sup):]
            break
            
    notes = text
    return utility, status, supplier, notes

def run_migration():
    db = SessionLocal()
    try:
        # ensure late_reason column exists (safe attempt for Postgres/SQLite)
        try:
            db.execute("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_reason TEXT;")
            db.commit()
        except Exception:
            db.rollback()
            try:
                db.execute("ALTER TABLE attendance ADD COLUMN late_reason TEXT;")
                db.commit()
            except Exception:
                db.rollback()
        
        print("Starting database migration and data cleanup...")
        
        # 1. Clean up User names
        users = db.query(User).all()
        for u in users:
            old_name = u.name
            new_name = old_name.replace(" Agent", "").replace(" Manager", "")
            if old_name != new_name:
                u.name = new_name
                print(f"Cleaned up username: '{old_name}' -> '{new_name}'")
                
        # 2. Clean up Customer concatenated business names
        customers = db.query(Customer).all()
        for c in customers:
            parsed = parse_customer_concatenated(c.business_name)
            if parsed:
                bname, oname, phone, postcode = parsed
                print(f"Parsed concatenated customer: '{c.business_name}' -> Business: '{bname}', Owner: '{oname}', Phone: '{phone}', Postcode: '{postcode}'")
                c.business_name = bname
                c.owner_name = oname
                c.business_phone = phone
                c.postcode = postcode
                
        # 3. Clean up Callbacks notes / utility fields
        callbacks = db.query(CallBack).all()
        for cb in callbacks:
            parsed = parse_concatenated_notes(cb.notes)
            if parsed:
                utility, status, supplier, notes = parsed
                if utility and status:
                    print(f"Parsed callback notes: '{cb.notes}' -> Utility: '{utility}', Status: '{status}', Supplier: '{supplier}', Notes: '{notes}'")
                    if utility:
                        cust = db.query(Customer).filter(Customer.id == cb.customer_id).first()
                        if cust:
                            cust.utility_type = utility
                    if status:
                        cb.status = status
                    if supplier:
                        cb.elec_offer_supplier = supplier
                    cb.notes = notes
                    
        # 4. Clean up Transfers notes / utility fields
        transfers = db.query(Transfer).all()
        for t in transfers:
            parsed = parse_concatenated_notes(t.notes)
            if parsed:
                utility, status, supplier, notes = parsed
                if utility and status:
                    print(f"Parsed transfer notes: '{t.notes}' -> Utility: '{utility}', Status: '{status}', Supplier: '{supplier}', Notes: '{notes}'")
                    if utility:
                        t.utility_type = utility
                    if status:
                        t.status = status
                    if supplier:
                        t.elec_offer_supplier = supplier
                    t.notes = notes
                    
        db.commit()
        print("Migration and cleanup completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
