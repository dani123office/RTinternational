import pyodbc

def get_connection():
    for server in ["localhost", "(localdb)\\MSSQLLocalDB"]:
        try:
            return pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};Trusted_Connection=yes;DATABASE=CallCenterDB;')
        except Exception:
            continue
    raise Exception("Could not connect to any SQL Server instance")

conn = get_connection()
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='dbo' ORDER BY TABLE_NAME")
tables = [row[0] for row in cursor.fetchall()]
print('Tables in CallCenterDB:')
for t in tables:
    print(f'  {t}')
cursor.close()
conn.close()
