import sqlite3
conn = sqlite3.connect('C:/Users/ahsan/Downloads/RTinternational/CallCenterAPI_FastAPI/callcenter.db')
c = conn.cursor()

# Check all callbacks
c.execute("SELECT id FROM call_backs ORDER BY id")
all_cbs = c.fetchall()
print("All callback IDs:", [r[0] for r in all_cbs])

# Check callback_offered_electricity_rates structure
c.execute("PRAGMA table_info(callback_offered_electricity_rates)")
cols = c.fetchall()
print("callback_offered_electricity_rates columns:", [(col[1], col[2]) for col in cols])

# Check for any existing data
c.execute("SELECT COUNT(*) FROM callback_offered_electricity_rates")
count = c.fetchone()
print("Total elec rate records:", count[0])

c.execute("SELECT * FROM callback_offered_electricity_rates LIMIT 5")
rows = c.fetchall()
if rows:
    print("Sample elec rates:", rows)

conn.close()
