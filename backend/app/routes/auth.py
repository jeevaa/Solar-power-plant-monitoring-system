from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import db
from app.models.user import User
from app.utils.auth_helpers import admin_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'This account has been deactivated. Contact an administrator.'}), 403

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    if confirm_password and password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'An account with this email address already exists'}), 409

    # Secure role assignment: Public registrations are assigned VIEWER role.
    # Administrator privileges must be granted by existing administrators or the CLI seeder.
    new_user = User(
        name=name,
        email=email,
        role='VIEWER',
        is_active=True
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    access_token = create_access_token(identity=str(new_user.id))
    return jsonify({
        'message': 'Registration successful. Account created with Viewer privileges.',
        'access_token': access_token,
        'user': new_user.to_dict()
    }), 201

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()

    new_password = data.get('new_password')
    if new_password:
        current_password = data.get('current_password')
        if not current_password or not user.check_password(current_password):
            return jsonify({'error': 'Current password verification failed'}), 400
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        user.set_password(new_password)

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully', 'user': user.to_dict()}), 200

@auth_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200

@auth_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    new_role = data.get('role', '').upper()
    if new_role not in ['ADMIN', 'OPERATOR', 'VIEWER']:
        return jsonify({'error': 'Invalid role. Must be ADMIN, OPERATOR, or VIEWER'}), 400

    user.role = new_role
    db.session.commit()
    return jsonify({'message': f'Role updated to {new_role}', 'user': user.to_dict()}), 200
