import pyodbc

def get_connection():
    for server in ["localhost", "(localdb)\\MSSQLLocalDB"]:
        try:
            conn = pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};Trusted_Connection=yes;DATABASE=CallCenterDB;')
            conn.autocommit = True
            return conn
        except Exception:
            continue
    raise Exception("Could not connect to any SQL Server instance")

conn = get_connection()
cursor = conn.cursor()

# Drop all FK constraints first, then drop tables
cursor.execute("""
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(13)
FROM sys.foreign_keys;
EXEC sp_executesql @sql;
""")

cursor.execute("""
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA='dbo' AND TABLE_TYPE='BASE TABLE'
ORDER BY TABLE_NAME
""")
tables = [row[0] for row in cursor.fetchall()]
print(f'Found {len(tables)} tables, dropping...')

for t in tables:
    cursor.execute(f'DROP TABLE IF EXISTS dbo.[{t}]')
    print(f'  Dropped {t}')

print('All tables dropped.')
cursor.close()
conn.close()
