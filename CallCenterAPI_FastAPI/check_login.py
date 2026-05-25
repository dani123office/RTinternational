import pyodbc, bcrypt
conn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;Trusted_Connection=yes;DATABASE=CallCenterDB;')
cursor = conn.cursor()
cursor.execute("SELECT email, password_hash FROM users WHERE email='admin@test.com'")
row = cursor.fetchone()
pw_hash = row[1]
print('Hash length:', len(pw_hash))
print(f'Verify: {bcrypt.checkpw(b"password", pw_hash.encode("utf-8"))}')
cursor.close()
conn.close()
