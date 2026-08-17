import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'instance', 'queue.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, definition):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        print(f"Added {column} to {table}")
    except sqlite3.OperationalError as e:
        print(f"Skipped {column}: {e}")

add_column("system_setting", "shrink_timeout", "INTEGER DEFAULT 15")
add_column("system_setting", "collapse_timeout", "INTEGER DEFAULT 30")
add_column("system_setting", "ads_interval", "INTEGER DEFAULT 10")

conn.commit()
conn.close()
