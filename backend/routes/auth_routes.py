from flask import Blueprint, request, jsonify
from models import db, User, Division
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
import datetime
from config import Config
from auth_middleware import token_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Missing credentials'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    # Generate token
    token = jwt.encode({
        'id': user.id,
        'role': user.role,
        'division_id': user.division_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }, Config.SECRET_KEY, algorithm="HS256")
    
    division_name = None
    if user.division_id:
        division = Division.query.get(user.division_id)
        division_name = division.name
        
    return jsonify({
        'id': user.id,
        'username': user.username,
        'role': user.role,
        'division_id': user.division_id,
        'division_name': division_name,
        'token': token,
        'success': True
    })

@auth_bp.route('/users', methods=['GET', 'POST'])
@token_required
def manage_users(current_user):
    # Only Admin can manage users
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'POST':
        data = request.json
        u = User(
            username=data['username'],
            password_hash=generate_password_hash(data['password']),
            role=data['role'],
            division_id=data.get('division_id')
        )
        db.session.add(u)
        db.session.commit()
        return jsonify({'success': True, 'id': u.id})
        
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'role': u.role,
        'division_id': u.division_id
    } for u in users])

@auth_bp.route('/users/<int:user_id>/reset', methods=['POST'])
@token_required
def reset_password(current_user, user_id):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Not found'}), 404
    data = request.json
    user.password_hash = generate_password_hash(data['password'])
    db.session.commit()
    return jsonify({'success': True})

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user, user_id):
    if current_user.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Not found'}), 404
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Cannot delete user because they have associated records.'}), 400

@auth_bp.route('/teller/password', methods=['PUT'])
@token_required
def update_teller_password(current_user):
    data = request.json
    teller_id = data.get('teller_id')
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if current_user.get('role') != 'Admin' and current_user.get('id') != teller_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get(teller_id)
    if not user or not check_password_hash(user.password_hash, old_password):
        return jsonify({'error': 'Invalid current password'}), 400
        
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'success': True})
