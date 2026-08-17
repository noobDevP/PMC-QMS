import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'instance', 'data.db')
conn = sqlite3.connect(db_path)
print(conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall())
conn.close()
