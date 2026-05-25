import pyodbc
conn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;Trusted_Connection=yes;')
cursor = conn.cursor()
cursor.execute("SELECT physical_name FROM sys.master_files WHERE database_id = DB_ID('CallCenterDB')")
for row in cursor.fetchall():
    print(row[0])
cursor.close()
conn.close()
