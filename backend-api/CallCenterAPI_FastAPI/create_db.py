import pyodbc

def get_connection():
    for server in ["localhost", "(localdb)\\MSSQLLocalDB"]:
        try:
            conn = pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};Trusted_Connection=yes;')
            conn.autocommit = True
            return conn
        except Exception:
            continue
    raise Exception("Could not connect to any SQL Server instance")

conn = get_connection()
cursor = conn.cursor()
cursor.execute("IF NOT EXISTS (SELECT name FROM sys.databases WHERE name='CallCenterDB') CREATE DATABASE CallCenterDB")
print('Database CallCenterDB ready')
cursor.close()
conn.close()
