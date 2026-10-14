from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import db
from app.models.settings import SystemSetting
from app.utils.auth_helpers import admin_required

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

@settings_bp.route('', methods=['GET'])
@jwt_required()
def get_settings():
    settings = SystemSetting.query.all()
    grouped = {}
    for s in settings:
        cat = s.category or 'GENERAL'
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(s.to_dict())

    return jsonify({
        'settings': [s.to_dict() for s in settings],
        'grouped': grouped
    }), 200

@settings_bp.route('', methods=['PUT'])
@admin_required
def update_settings():
    data = request.get_json() or {}
    items = data.get('settings', [])

    updated = []
    for item in items:
        key = item.get('key')
        val = item.get('value')
        if key and val is not None:
            s = SystemSetting.query.get(key)
            if s:
                s.value = str(val)
                updated.append(s.to_dict())

    db.session.commit()
    return jsonify({
        'message': f'Updated {len(updated)} setting(s)',
        'updated_settings': updated
    }), 200
