import sqlite3

def run_migration():
    conn = sqlite3.connect('instance/queue.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE division ADD COLUMN tv_id INTEGER DEFAULT 1")
        conn.commit()
        print("Added tv_id column to division table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("tv_id column already exists.")
        else:
            print("Error altering table:", e)
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()
