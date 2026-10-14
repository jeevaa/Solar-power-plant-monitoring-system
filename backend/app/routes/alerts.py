from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db
from app.models.user import User
from app.models.alert import Alert
from app.utils.auth_helpers import operator_required

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')

@alerts_bp.route('', methods=['GET'])
@jwt_required()
def list_alerts():
    plant_id = request.args.get('plant_id')
    severity = request.args.get('severity')
    status = request.args.get('status')
    alert_type = request.args.get('alert_type')

    query = Alert.query

    if plant_id:
        query = query.filter_by(plant_id=plant_id)
    if severity:
        query = query.filter_by(severity=severity.upper())
    if status:
        query = query.filter_by(status=status.upper())
    if alert_type:
        query = query.filter_by(alert_type=alert_type)

    alerts = query.order_by(Alert.detection_timestamp.desc()).all()
    return jsonify({
        'alerts': [a.to_dict() for a in alerts],
        'total_count': len(alerts)
    }), 200

@alerts_bp.route('/<int:alert_id>', methods=['GET'])
@jwt_required()
def get_alert_detail(alert_id):
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
    return jsonify({'alert': alert.to_dict()}), 200

@alerts_bp.route('/<int:alert_id>/acknowledge', methods=['POST'])
@operator_required
def acknowledge_alert(alert_id):
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    alert.status = 'ACKNOWLEDGED'
    alert.acknowledged_by = user.email if user else 'Operator'
    alert.acknowledged_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message': 'Alert acknowledged successfully',
        'alert': alert.to_dict()
    }), 200

@alerts_bp.route('/<int:alert_id>/resolve', methods=['POST'])
@operator_required
def resolve_alert(alert_id):
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404

    data = request.get_json() or {}
    notes = data.get('resolution_notes', '').strip()
    if not notes:
        return jsonify({'error': 'Resolution notes are required to resolve an alert'}), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    alert.status = 'RESOLVED'
    alert.resolved_by = user.email if user else 'Operator'
    alert.resolved_at = datetime.utcnow()
    alert.resolution_notes = notes
    db.session.commit()

    return jsonify({
        'message': 'Alert resolved successfully',
        'alert': alert.to_dict()
    }), 200
