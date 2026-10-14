from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import User

def get_current_user():
    """Returns current authenticated User instance or None"""
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        return User.query.get(user_id)
    except Exception:
        return None

def role_required(*allowed_roles):
    """Decorator to enforce role-based access control (RBAC)"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'Unauthorized: Account inactive or not found'}), 401
            
            if user.role not in allowed_roles:
                return jsonify({
                    'error': f'Forbidden: Action requires one of roles: {", ".join(allowed_roles)}',
                    'user_role': user.role
                }), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required(fn):
    return role_required('ADMIN')(fn)

def operator_required(fn):
    return role_required('ADMIN', 'OPERATOR')(fn)
