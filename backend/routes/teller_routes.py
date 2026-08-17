from flask import Blueprint, request, jsonify, Response
from auth_middleware import token_required
from models import db, Ticket, Purpose, Division
from datetime import datetime
import subprocess
import sys
import os
import csv
import io
from datetime import datetime

teller_bp = Blueprint('teller', __name__)

@teller_bp.route('/queue/<int:division_id>', methods=['GET'])
@token_required
def get_queue(current_user, division_id):
    # Get tickets IN_QUEUE or SERVING for the division
    tickets = Ticket.query.filter(
        Ticket.division_id == division_id,
        Ticket.status.in_(['IN_QUEUE', 'SERVING'])
    ).order_by(Ticket.created_at).all()
    
    return jsonify([{
        'id': t.id,
        'ticket_number': t.ticket_number,
        'customer_type': t.customer_type,
        'customer_name': t.customer_name,
        'purpose': Purpose.query.get(t.purpose_id).name if t.purpose_id else '',
        'status': t.status,
        'created_at': t.created_at.isoformat()
    } for t in tickets])

@teller_bp.route('/purposes', methods=['POST'])
def create_teller_purpose():
    data = request.json
    name = data.get('name')
    division_id = data.get('division_id')
    if not name or not division_id:
        return jsonify({'error': 'Missing data'}), 400
    p = Purpose(name=name, division_id=division_id)
    db.session.add(p)
    db.session.commit()
    return jsonify({'success': True, 'id': p.id})

@teller_bp.route('/purposes', methods=['GET'])
def get_teller_purposes():
    division_id = request.args.get('division_id')
    if not division_id:
        return jsonify([])
    purposes = Purpose.query.filter_by(division_id=division_id).all()
    return jsonify([{'id': p.id, 'name': p.name} for p in purposes])

@teller_bp.route('/purposes/<int:purpose_id>', methods=['DELETE'])
def delete_teller_purpose(purpose_id):
    p = Purpose.query.get(purpose_id)
    if not p:
        return jsonify({'error': 'Not found'}), 404
    try:
        db.session.delete(p)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Cannot delete purpose because it is linked to existing tickets. Please clear tickets first.'}), 400

@teller_bp.route('/ticket/<int:ticket_id>/accept', methods=['POST'])
@token_required
def accept_ticket(current_user, ticket_id):
    teller_id = request.json.get('teller_id') # In real app, from JWT
    ticket = Ticket.query.get(ticket_id)
    if not ticket or ticket.status != 'IN_QUEUE':
        return jsonify({'error': 'Invalid ticket'}), 400
        
    ticket.status = 'SERVING'
    ticket.served_at = datetime.now()
    ticket.teller_id = teller_id
    
    division = Division.query.get(ticket.division_id)
    purpose = Purpose.query.get(ticket.purpose_id)
    
    from extensions import socketio
    
    # Generate TTS with commas for pauses around the ticket number
    spaced_ticket = " ".join(ticket.ticket_number).replace(" - ", ", ")
    text = f"now serving ticket number, {spaced_ticket}, you may now proceed"
    filename = f"tts_serving_{ticket.id}.wav"
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    filepath = os.path.join(uploads_dir, filename)
    subprocess.run([sys.executable, 'generate_tts.py', text, filepath], cwd=os.path.dirname(os.path.dirname(__file__)))
    
    db.session.commit()
    
    socketio.emit('TICKET_SERVING', {
        'id': ticket.id,
        'ticket_number': ticket.ticket_number,
        'division_name': division.name,
        'customer_type': ticket.customer_type,
        'customer_name': ticket.customer_name,
        'purpose': purpose.name if purpose else '',
        'additional_info': ticket.additional_info,
        'tv_id': division.tv_id,
        'audio_url': f"/uploads/{filename}"
    })
    
    return jsonify({'success': True})

@teller_bp.route('/ticket/<int:ticket_id>/complete', methods=['POST'])
@token_required
def complete_ticket(current_user, ticket_id):
    ticket = Ticket.query.get(ticket_id)
    if not ticket or ticket.status != 'SERVING':
        return jsonify({'error': 'Invalid ticket'}), 400
        
    ticket.status = 'COMPLETED'
    ticket.completed_at = datetime.now()
    db.session.commit()
    
    from extensions import socketio
    division = Division.query.get(ticket.division_id)
    tv_id = division.tv_id if division else 1
    socketio.emit('TICKET_COMPLETED', {'id': ticket.id, 'tv_id': tv_id})
    
    return jsonify({'success': True})

@teller_bp.route('/ticket/<int:ticket_id>/reroute', methods=['POST'])
@token_required
def reroute_ticket(current_user, ticket_id):
    data = request.json
    target_division_id = data.get('target_division_id')
    target_purpose_id = data.get('target_purpose_id')
    
    if not target_division_id or not target_purpose_id:
        return jsonify({'error': 'Missing target division or purpose'}), 400
        
    ticket = Ticket.query.get(ticket_id)
    if not ticket or ticket.status != 'SERVING':
        return jsonify({'error': 'Invalid ticket or ticket not being served'}), 400
        
    old_division = Division.query.get(ticket.division_id)
    old_tv_id = old_division.tv_id if old_division else 1
    
    # Apply reroute changes
    ticket.division_id = target_division_id
    ticket.purpose_id = target_purpose_id
    ticket.status = 'IN_QUEUE'
    ticket.served_at = None
    ticket.teller_id = None
    
    db.session.commit()
    
    from extensions import socketio
    new_division = Division.query.get(target_division_id)
    new_tv_id = new_division.tv_id if new_division else 1
    
    # Notify old division to remove from serving list
    socketio.emit('TICKET_CANCELLED', {'id': ticket.id, 'tv_id': old_tv_id})
    # Notify new division to add to in_queue
    socketio.emit('TICKET_CREATED', {'tv_id': new_tv_id})
    
    return jsonify({'success': True})

@teller_bp.route('/purpose', methods=['POST'])
def create_purpose():
    data = request.json
    p = Purpose(name=data['name'], division_id=data['division_id'])
    db.session.add(p)
    db.session.commit()
    return jsonify({'success': True, 'id': p.id})

@teller_bp.route('/export/<int:division_id>', methods=['GET'])
def export_tickets(division_id):
    tickets = Ticket.query.filter_by(division_id=division_id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Ticket Number', 'Customer Type', 'Status', 'Created At', 'Served At', 'Completed At', 'Queue Time (mins)', 'Total Serving Time (mins)'])
    
    for t in tickets:
        queue_time = ''
        serving_time = ''
        if t.created_at and t.served_at:
            queue_time = round((t.served_at - t.created_at).total_seconds() / 60.0, 2)
        if t.served_at and t.completed_at:
            serving_time = round((t.completed_at - t.served_at).total_seconds() / 60.0, 2)

        writer.writerow([
            t.id, t.ticket_number, t.customer_type, t.status, 
            t.created_at, t.served_at, t.completed_at,
            queue_time, serving_time
        ])
        
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=unit_{unit_id}_tickets.csv"}
    )


