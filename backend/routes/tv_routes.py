from flask import Blueprint, jsonify
from models import db, SystemSetting, AdMedia, Ticket, Division, Purpose
from datetime import datetime

tv_bp = Blueprint('tv', __name__)

@tv_bp.route('/state/<int:tv_id>', methods=['GET'])
def get_tv_state(tv_id):
    setting = SystemSetting.query.first()
    ads = AdMedia.query.all()
    
    # Get active tickets
    active_tickets = Ticket.query.filter(Ticket.status.in_(['IN_QUEUE', 'SERVING'])).order_by(Ticket.created_at).all()
    
    # Filter for tickets belonging to divisions assigned to this tv_id
    filtered_tickets = []
    for t in active_tickets:
        division = Division.query.get(t.division_id)
        if division and division.tv_id == tv_id:
            filtered_tickets.append(t)
    
    in_queue = [t for t in filtered_tickets if t.status == 'IN_QUEUE']
    serving = [t for t in filtered_tickets if t.status == 'SERVING']
    serving.sort(key=lambda x: (x.served_at or datetime.min), reverse=True)
    
    in_queue_data = [{
        'id': t.id,
        'ticket_number': t.ticket_number,
        'customer_type': t.customer_type,
        'customer_name': t.customer_name,
        'purpose': Purpose.query.get(t.purpose_id).name if t.purpose_id else '',
        'division_name': Division.query.get(t.division_id).name if t.division_id else ''
    } for t in in_queue]

    serving_data = [{
        'id': t.id,
        'ticket_number': t.ticket_number,
        'customer_type': t.customer_type,
        'customer_name': t.customer_name,
        'purpose': Purpose.query.get(t.purpose_id).name if t.purpose_id else '',
        'division_name': Division.query.get(t.division_id).name if t.division_id else ''
    } for t in serving]
            
    return jsonify({
        'settings': {
            'tv_idle_seconds': setting.tv_idle_seconds if setting else 30,
            'shrink_timeout': setting.shrink_timeout if setting else 15,
            'collapse_timeout': setting.collapse_timeout if setting else 30,
            'periodic_return_timer': setting.periodic_return_timer if setting else 0,
            'periodic_return_mode': setting.periodic_return_mode if setting else 'full_queue',
            'ads_interval': setting.ads_interval if setting else 10,
            'announcement': setting.announcement if setting else '',
            'media_mode': setting.media_mode if setting else 'ads',
            'youtube_id': setting.youtube_id if setting else ''
        },
        'ads': [{'id': a.id, 'filename': a.filename, 'file_type': a.file_type, 'duration': a.duration} for a in ads],
        'queue': {
            'in_queue': in_queue_data,
            'serving': serving_data
        }
    })
