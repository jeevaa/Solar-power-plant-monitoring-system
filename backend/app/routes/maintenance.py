from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import db
from app.models.maintenance import MaintenanceTask
from app.utils.auth_helpers import operator_required, admin_required

maintenance_bp = Blueprint('maintenance', __name__, url_prefix='/api/maintenance')

@maintenance_bp.route('', methods=['GET'])
@jwt_required()
def list_tasks():
    plant_id = request.args.get('plant_id')
    status = request.args.get('status')
    priority = request.args.get('priority')

    query = MaintenanceTask.query
    if plant_id:
        query = query.filter_by(plant_id=plant_id)
    if status:
        query = query.filter_by(status=status.upper())
    if priority:
        query = query.filter_by(priority=priority.upper())

    tasks = query.order_by(MaintenanceTask.due_date.asc()).all()
    return jsonify({
        'tasks': [t.to_dict() for t in tasks],
        'total_count': len(tasks)
    }), 200

@maintenance_bp.route('', methods=['POST'])
@operator_required
def create_task():
    data = request.get_json() or {}
    
    plant_id = data.get('plant_id', '').strip()
    title = data.get('title', '').strip()
    equipment = data.get('equipment', '').strip()
    technician_name = data.get('technician_name', '').strip()
    due_date_str = data.get('due_date')

    if not plant_id or not title or not equipment or not technician_name or not due_date_str:
        return jsonify({'error': 'Plant ID, Title, Equipment, Technician, and Due Date are required'}), 400

    try:
        due_date_val = datetime.strptime(due_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid due date format. Expected YYYY-MM-DD'}), 400

    scheduled_date_val = date.today()
    if data.get('scheduled_date'):
        try:
            scheduled_date_val = datetime.strptime(data.get('scheduled_date'), '%Y-%m-%d').date()
        except ValueError:
            pass

    task = MaintenanceTask(
        plant_id=plant_id,
        title=title,
        equipment=equipment,
        description=data.get('description', ''),
        priority=data.get('priority', 'MEDIUM').upper(),
        status=data.get('status', 'SCHEDULED').upper(),
        technician_name=technician_name,
        technician_email=data.get('technician_email', ''),
        scheduled_date=scheduled_date_val,
        due_date=due_date_val,
        notes=data.get('notes', '')
    )

    db.session.add(task)
    db.session.commit()

    return jsonify({
        'message': 'Maintenance task created successfully',
        'task': task.to_dict()
    }), 201

@maintenance_bp.route('/<int:task_id>', methods=['PUT'])
@operator_required
def update_task(task_id):
    task = MaintenanceTask.query.get(task_id)
    if not task:
        return jsonify({'error': 'Maintenance task not found'}), 404

    data = request.get_json() or {}

    if 'title' in data: task.title = data['title']
    if 'equipment' in data: task.equipment = data['equipment']
    if 'description' in data: task.description = data['description']
    if 'priority' in data: task.priority = data['priority'].upper()
    if 'technician_name' in data: task.technician_name = data['technician_name']
    if 'technician_email' in data: task.technician_email = data['technician_email']
    if 'notes' in data: task.notes = data['notes']
    
    if 'status' in data:
        new_status = data['status'].upper()
        task.status = new_status
        if new_status == 'COMPLETED' and not task.completed_at:
            task.completed_at = datetime.utcnow()

    if 'due_date' in data and data['due_date']:
        try:
            task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            pass

    db.session.commit()
    return jsonify({
        'message': 'Maintenance task updated successfully',
        'task': task.to_dict()
    }), 200

@maintenance_bp.route('/<int:task_id>/status', methods=['PUT'])
@operator_required
def update_task_status(task_id):
    task = MaintenanceTask.query.get(task_id)
    if not task:
        return jsonify({'error': 'Maintenance task not found'}), 404

    data = request.get_json() or {}
    status = data.get('status', '').upper()
    if status not in ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']:
        return jsonify({'error': 'Invalid maintenance status'}), 400

    task.status = status
    if status == 'COMPLETED':
        task.completed_at = datetime.utcnow()
        if data.get('completion_notes'):
            task.notes = (task.notes or '') + f"\n[Completion note: {data['completion_notes']}]"
    
    db.session.commit()
    return jsonify({
        'message': f'Task status updated to {status}',
        'task': task.to_dict()
    }), 200

@maintenance_bp.route('/<int:task_id>', methods=['DELETE'])
@admin_required
def delete_task(task_id):
    task = MaintenanceTask.query.get(task_id)
    if not task:
        return jsonify({'error': 'Maintenance task not found'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': f'Maintenance task #{task_id} deleted successfully'}), 200
