from flask import Blueprint, request, jsonify, Response
from models import db, User, AdMedia, SystemSetting, Ticket, Purpose, Division
from werkzeug.security import generate_password_hash
import os
import csv
import io
from werkzeug.utils import secure_filename
from config import Config
from auth_middleware import token_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/settings', methods=['GET', 'POST'])
@token_required
def system_settings(current_user):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
    setting = SystemSetting.query.first()
    if not setting:
        setting = SystemSetting()
        db.session.add(setting)
        db.session.commit()
        
    if request.method == 'POST':
        data = request.json
        setting.tv_idle_seconds = data.get('tv_idle_seconds', setting.tv_idle_seconds)
        setting.shrink_timeout = data.get('shrink_timeout', setting.shrink_timeout)
        setting.collapse_timeout = data.get('collapse_timeout', setting.collapse_timeout)
        setting.periodic_return_timer = data.get('periodic_return_timer', setting.periodic_return_timer)
        setting.ads_interval = data.get('ads_interval', setting.ads_interval)
        setting.announcement = data.get('announcement', setting.announcement)
        setting.periodic_return_mode = data.get('periodic_return_mode', setting.periodic_return_mode)
        setting.media_mode = data.get('media_mode', setting.media_mode)
        setting.youtube_id = data.get('youtube_id', setting.youtube_id)
        db.session.commit()
        
        from extensions import socketio
        socketio.emit('SETTINGS_UPDATED', {
            'tv_idle_seconds': setting.tv_idle_seconds,
            'shrink_timeout': setting.shrink_timeout,
            'collapse_timeout': setting.collapse_timeout,
            'periodic_return_timer': setting.periodic_return_timer,
            'periodic_return_mode': setting.periodic_return_mode,
            'ads_interval': setting.ads_interval,
            'announcement': setting.announcement,
            'media_mode': setting.media_mode,
            'youtube_id': setting.youtube_id
        })
        
        return jsonify({'success': True})
        
    return jsonify({
        'tv_idle_seconds': setting.tv_idle_seconds,
        'shrink_timeout': setting.shrink_timeout,
        'collapse_timeout': setting.collapse_timeout,
        'periodic_return_timer': setting.periodic_return_timer,
        'periodic_return_mode': setting.periodic_return_mode,
        'ads_interval': setting.ads_interval,
        'announcement': setting.announcement,
        'media_mode': setting.media_mode,
        'youtube_id': setting.youtube_id
    })

@admin_bp.route('/divisions', methods=['GET'])
def get_divisions():
    divisions = Division.query.all()
    return jsonify([{'id': d.id, 'name': d.name, 'prefix': d.prefix, 'tv_id': d.tv_id} for d in divisions])

@admin_bp.route('/divisions', methods=['POST'])
@token_required
def create_division(current_user):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    division = Division(
        name=data['name'],
        prefix=data['prefix'],
        tv_id=data.get('tv_id', 1)
    )
    db.session.add(division)
    db.session.commit()
    return jsonify({'success': True, 'id': division.id})

@admin_bp.route('/divisions/<int:div_id>', methods=['PUT'])
def update_division(div_id):
    data = request.json
    division = Division.query.get_or_404(div_id)
    if 'tv_id' in data:
        division.tv_id = data['tv_id']
    if 'name' in data:
@admin_bp.route('/divisions/<int:div_id>', methods=['PUT', 'DELETE'])
@token_required
def manage_division(current_user, div_id):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    division = Division.query.get_or_404(div_id)
    if request.method == 'PUT':
        data = request.json
        if 'tv_id' in data:
            division.tv_id = data['tv_id']
        if 'name' in data:
            division.name = data['name']
        if 'prefix' in data:
            division.prefix = data['prefix']
        db.session.commit()
        return jsonify({'success': True})
    
    # Delete associated records to satisfy foreign key constraints
    Ticket.query.filter_by(division_id=div_id).delete()
    Purpose.query.filter_by(division_id=div_id).delete()
    User.query.filter_by(division_id=div_id).delete()
    
    db.session.delete(division)
    db.session.commit()
    return jsonify({'success': True})

@admin_bp.route('/purposes', methods=['POST'])
@token_required
def create_purpose(current_user):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    name = data.get('name')
    division_id = data.get('division_id')
    if not name or not division_id:
        return jsonify({'error': 'Missing data'}), 400
    p = Purpose(name=name, division_id=division_id)
    db.session.add(p)
    db.session.commit()
    return jsonify({'success': True, 'id': p.id})

@admin_bp.route('/purposes/<int:purpose_id>', methods=['DELETE'])
@token_required
def manage_purpose(current_user, purpose_id):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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

@admin_bp.route('/ads', methods=['GET', 'POST'])
@token_required
def manage_ads(current_user):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        filename = secure_filename(file.filename)
        file.save(os.path.join(Config.UPLOAD_FOLDER, filename))
        
        file_type = 'video' if filename.lower().endswith(('.mp4', '.webm')) else 'image'
        ad = AdMedia(filename=filename, file_type=file_type, duration=int(request.form.get('duration', 10)))
        db.session.add(ad)
        db.session.commit()
        
        from extensions import socketio
        socketio.emit('ADS_UPDATED', {})
        return jsonify({'success': True, 'id': ad.id})
        
    ads = AdMedia.query.all()
    return jsonify([{
        'id': a.id,
        'filename': a.filename,
        'file_type': a.file_type,
        'duration': a.duration
    } for a in ads])

@admin_bp.route('/ads/<int:ad_id>', methods=['DELETE'])
@token_required
def delete_ad(current_user, ad_id):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    ad = AdMedia.query.get(ad_id)
    if ad:
        try:
            os.remove(os.path.join(Config.UPLOAD_FOLDER, ad.filename))
        except:
            pass
        db.session.delete(ad)
        db.session.commit()
        from app import socketio
        socketio.emit('ADS_UPDATED', {})
    return jsonify({'success': True})

@admin_bp.route('/export', methods=['GET'])
@token_required
def export_tickets(current_user):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    tickets = Ticket.query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Ticket Number', 'Division ID', 'Customer Type', 'Status', 'Created At', 'Served At', 'Completed At', 'Queue Time (mins)', 'Total Serving Time (mins)'])
    
    for t in tickets:
        queue_time = ''
        serving_time = ''
        if t.created_at and t.served_at:
            queue_time = round((t.served_at - t.created_at).total_seconds() / 60.0, 2)
        if t.served_at and t.completed_at:
            serving_time = round((t.completed_at - t.served_at).total_seconds() / 60.0, 2)

        writer.writerow([
            t.id, t.ticket_number, t.division_id, t.customer_type, t.status, 
            t.created_at, t.served_at, t.completed_at,
            queue_time, serving_time
        ])
        
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=all_tickets.csv"}
    )

@admin_bp.route('/resolved', methods=['DELETE'])
@token_required
def delete_resolved(current_user):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    Ticket.query.filter(Ticket.status.in_(['COMPLETED', 'CANCELLED'])).delete()
    db.session.commit()
    return jsonify({'success': True})
