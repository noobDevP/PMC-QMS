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

add_column("ticket", "customer_name", "VARCHAR(100) DEFAULT ''")

conn.commit()
conn.close()
