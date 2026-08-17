from flask import Blueprint, request, jsonify
from models import db, Purpose, Ticket, Division
from datetime import datetime
import subprocess
import sys
import os

kiosk_bp = Blueprint('kiosk', __name__)

@kiosk_bp.route('/divisions', methods=['GET'])
def get_divisions():
    divisions = Division.query.all()
    return jsonify([{'id': d.id, 'name': d.name} for d in divisions])

@kiosk_bp.route('/purposes/<int:division_id>', methods=['GET'])
def get_purposes(division_id):
    purposes = Purpose.query.filter_by(division_id=division_id).all()
    return jsonify([{'id': p.id, 'name': p.name} for p in purposes])

@kiosk_bp.route('/ticket', methods=['POST'])
def create_ticket():
    data = request.json
    division_id = data.get('division_id')
    purpose_id = data.get('purpose_id')
    customer_type = data.get('customer_type') # 'Active' or 'Retired'
    customer_name = data.get('customer_name', '')
    
    if not division_id or not purpose_id or not customer_type:
        return jsonify({'error': 'Missing required fields'}), 400
        
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Invalid Division'}), 400
        
    purpose = Purpose.query.get(purpose_id)
    if not purpose:
        return jsonify({'error': 'Purpose not found'}), 404
        
    # Generate Ticket Number
    today = datetime.now().date()
    # Count tickets for this division today
    count = Ticket.query.filter(
        Ticket.division_id == division_id,
        db.func.date(Ticket.created_at) == today
    ).count()
    
    # Format: MIB-A001
    suffix_letter = 'A' if customer_type == 'Active' else ('C' if customer_type == 'Civillian' else 'R')
    ticket_number = f"{division.prefix}-{suffix_letter}{(count + 1):03d}"
    
    ticket = Ticket(
        ticket_number=ticket_number,
        customer_type=data['customer_type'],
        customer_name=data.get('customer_name'),
        additional_info=data.get('additional_info'),
        division_id=data['division_id'],
        purpose_id=data['purpose_id'],
        status='IN_QUEUE'
    )
    db.session.add(ticket)
    db.session.flush()
    # Broadcast to SocketIO (using circular import workaround or passing socketio instance)
    from extensions import socketio
    
    # Generate TTS with commas for pauses around the ticket number
    spaced_ticket = " ".join(ticket.ticket_number).replace(" - ", ", ")
    text = f"ticket number, {spaced_ticket}, is now in queue, please wait for your number to be called"
    filename = f"tts_created_{ticket.id}.wav"
    # Ensure uploads directory exists and path is absolute
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    filepath = os.path.join(uploads_dir, filename)
    subprocess.run([sys.executable, 'generate_tts.py', text, filepath], cwd=os.path.dirname(os.path.dirname(__file__)))
    
    db.session.commit()
    
    socketio.emit('TICKET_CREATED', {
        'id': ticket.id,
        'ticket_number': ticket.ticket_number,
        'division_id': ticket.division_id,
        'division_name': division.name,
        'customer_type': ticket.customer_type,
        'customer_name': ticket.customer_name,
        'purpose': purpose.name,
        'tv_id': division.tv_id,
        'audio_url': f"/uploads/{filename}"
    })
    
    return jsonify({
        'id': ticket.id,
        'ticket_number': ticket.ticket_number,
        'status': ticket.status
    }), 201

@kiosk_bp.route('/ticket/<int:ticket_id>/cancel', methods=['POST'])
def cancel_ticket(ticket_id):
    ticket = Ticket.query.get(ticket_id)
    if not ticket or ticket.status != 'IN_QUEUE':
        return jsonify({'error': 'Cannot cancel this ticket'}), 400
        
    ticket.status = 'CANCELLED'
    db.session.commit()
    
    from extensions import socketio
    division = Division.query.get(ticket.division_id)
    tv_id = division.tv_id if division else 1
    socketio.emit('TICKET_CANCELLED', {'id': ticket.id, 'tv_id': tv_id})
    return jsonify({'success': True})
