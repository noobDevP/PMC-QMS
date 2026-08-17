from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from models import db, Ticket
from datetime import datetime, timedelta

def purge_old_tickets(app):
    with app.app_context():
        # Purge tickets older than 90 days that are COMPLETED or CANCELLED
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        old_tickets = Ticket.query.filter(
            Ticket.status.in_(['COMPLETED', 'CANCELLED']),
            Ticket.created_at < ninety_days_ago
        ).all()
        
        count = len(old_tickets)
        for t in old_tickets:
            db.session.delete(t)
            
        if count > 0:
            db.session.commit()
            print(f"[{datetime.utcnow()}] Purged {count} old tickets.")

def init_scheduler(app):
    scheduler = BackgroundScheduler()
    # Run everyday at midnight
    scheduler.add_job(
        func=purge_old_tickets,
        args=[app],
        trigger=CronTrigger(hour=0, minute=0),
        id='purge_job',
        name='Purge tickets older than 90 days',
        replace_existing=True
    )
    scheduler.start()
    return scheduler
