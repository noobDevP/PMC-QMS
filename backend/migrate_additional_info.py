import sqlite3

def run_migration():
    conn = sqlite3.connect('instance/queue.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE ticket ADD COLUMN additional_info VARCHAR(255)")
        conn.commit()
        print("Added additional_info column to ticket table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("additional_info column already exists.")
        else:
            print("Error altering table:", e)
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()
