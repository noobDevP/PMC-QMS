import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import db, User, Division, Purpose, Ticket, Setting, TVViewer, Ad
from app import app

# Path to the original SQLite database
SQLITE_URI = 'sqlite:///../../queue/backend/instance/queue.db'

def migrate_data():
    with app.app_context():
        # The MySQL URI is automatically loaded from app's config
        MYSQL_URI = app.config['SQLALCHEMY_DATABASE_URI']
        print(f"Target MySQL Database: {MYSQL_URI.split('@')[1]}")
        
        # 1. Create MySQL tables
        print("Creating MySQL tables...")
        db.create_all()

        # 2. Setup SQLite connection
        print("Connecting to SQLite database...")
        sqlite_engine = create_engine(SQLITE_URI)
        SqliteSession = sessionmaker(bind=sqlite_engine)
        sqlite_session = SqliteSession()

        # 3. Migrate Settings
        print("Migrating Settings...")
        settings = sqlite_session.query(Setting).all()
        for s in settings:
            db.session.merge(Setting(key=s.key, value=s.value))
            
        # 4. Migrate Users
        print("Migrating Users...")
        users = sqlite_session.query(User).all()
        for u in users:
            db.session.merge(User(id=u.id, username=u.username, password=u.password, role=u.role))
            
        # 5. Migrate Divisions
        print("Migrating Divisions...")
        divisions = sqlite_session.query(Division).all()
        for d in divisions:
            db.session.merge(Division(id=d.id, name=d.name))
            
        # 6. Migrate Purposes
        print("Migrating Purposes...")
        purposes = sqlite_session.query(Purpose).all()
        for p in purposes:
            db.session.merge(Purpose(id=p.id, division_id=p.division_id, name=p.name))
            
        # 7. Migrate TV Viewers
        print("Migrating TV Viewers...")
        tvs = sqlite_session.query(TVViewer).all()
        for t in tvs:
            db.session.merge(TVViewer(id=t.id, name=t.name))
            
        # 8. Migrate Ads
        print("Migrating Ads...")
        ads = sqlite_session.query(Ad).all()
        for a in ads:
            db.session.merge(Ad(id=a.id, type=a.type, url=a.url, order=a.order))
            
        # 9. Migrate Tickets
        print("Migrating Tickets...")
        tickets = sqlite_session.query(Ticket).all()
        for t in tickets:
            db.session.merge(Ticket(
                id=t.id, 
                ticket_number=t.ticket_number,
                division_id=t.division_id,
                purpose_id=t.purpose_id,
                status=t.status,
                customer_type=t.customer_type,
                customer_name=t.customer_name,
                additional_info=t.additional_info,
                created_at=t.created_at,
                served_at=t.served_at,
                completed_at=t.completed_at
            ))

        db.session.commit()
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate_data()
