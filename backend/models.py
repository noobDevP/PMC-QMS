from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class SystemSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tv_idle_seconds = db.Column(db.Integer, default=30)
    shrink_timeout = db.Column(db.Integer, default=15)
    collapse_timeout = db.Column(db.Integer, default=30)
    periodic_return_timer = db.Column(db.Integer, default=0) # 0 means disabled
    periodic_return_mode = db.Column(db.String(20), default='full_queue') # 'full_queue' or 'pip'
    ads_interval = db.Column(db.Integer, default=10)
    announcement = db.Column(db.Text, nullable=True)
    media_mode = db.Column(db.String(20), default='ads')
    youtube_id = db.Column(db.String(100), nullable=True)
    facebook_url = db.Column(db.String(500), nullable=True)
    
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='teller') # 'admin' or 'teller'
    division_id = db.Column(db.Integer, db.ForeignKey('division.id'), nullable=True) # Null for admin
    
class Division(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    prefix = db.Column(db.String(10), nullable=False) # e.g. MIB, DIR
    tv_id = db.Column(db.Integer, default=1)
    purposes = db.relationship('Purpose', backref='division', lazy=True)
    users = db.relationship('User', backref='assigned_division', lazy=True)
    
class Purpose(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    division_id = db.Column(db.Integer, db.ForeignKey('division.id'), nullable=False)

class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(20), nullable=False) # e.g. MIB-A001
    customer_type = db.Column(db.String(20), nullable=False) # 'Active', 'Civillian', or 'Retired'
    customer_name = db.Column(db.String(100), nullable=True)
    additional_info = db.Column(db.String(255), nullable=True)
    division_id = db.Column(db.Integer, db.ForeignKey('division.id'), nullable=False)
    purpose_id = db.Column(db.Integer, db.ForeignKey('purpose.id'), nullable=False)
    status = db.Column(db.String(20), default='IN_QUEUE') # IN_QUEUE, SERVING, COMPLETED, CANCELLED
    created_at = db.Column(db.DateTime, default=datetime.now)
    served_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    teller_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
class AdMedia(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(20), nullable=False) # 'image' or 'video'
    duration = db.Column(db.Integer, default=10) # seconds to show in carousel
    created_at = db.Column(db.DateTime, default=datetime.now)
