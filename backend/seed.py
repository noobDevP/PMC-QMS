from app import app, db
from models import Division, Purpose, User, SystemSetting
from werkzeug.security import generate_password_hash

def seed_db():
    with app.app_context():
        db.create_all()
        # Check if DB is already seeded
        if User.query.filter_by(username='admin').first():
            print("Database already seeded.")
            return

        print("Seeding database...")
        # Create SystemSettings
        setting = SystemSetting(tv_idle_seconds=30, periodic_return_timer=0)
        db.session.add(setting)
        
        # Create Admin user
        admin = User(username='admin', password_hash=generate_password_hash('admin123'), role='admin')
        db.session.add(admin)

        # Create Divisions
        div1 = Division(name='MIB', prefix='MIB', tv_id=1)
        div2 = Division(name='Office of the Director', prefix='DIR', tv_id=1)
        db.session.add_all([div1, div2])
        db.session.commit() # Commit to get division IDs
        
        # Create Teller for MIB
        teller1 = User(username='teller_mib', password_hash=generate_password_hash('teller123'), role='teller', division_id=div1.id)
        db.session.add(teller1)
        
        # Create Teller for Director
        teller2 = User(username='teller_dir', password_hash=generate_password_hash('teller123'), role='teller', division_id=div2.id)
        db.session.add(teller2)

        # Create Purposes for MIB
        p1 = Purpose(name='Membership Registration & Verification', division_id=div1.id)
        p2 = Purpose(name='Information Inquiry & Benefits Claim', division_id=div1.id)
        
        # Create Purposes for Director
        p3 = Purpose(name='Endorsement & Clearance Request', division_id=div2.id)
        p4 = Purpose(name='Executive Consultation & Special Appeals', division_id=div2.id)
        
        db.session.add_all([p1, p2, p3, p4])
        db.session.commit()
        
        print("Seeding complete. Admin user: admin / admin123")

if __name__ == '__main__':
    seed_db()
