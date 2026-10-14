from datetime import datetime, date
from app.models import db

class MaintenanceTask(db.Model):
    __tablename__ = 'maintenance_tasks'

    id = db.Column(db.Integer, primary_key=True)
    plant_id = db.Column(db.String(50), db.ForeignKey('solar_plants.id'), nullable=False, index=True)
    
    title = db.Column(db.String(150), nullable=False)
    equipment = db.Column(db.String(100), nullable=False) # Inverter, Solar PV Modules, Pyranometer, Transformer, etc.
    description = db.Column(db.Text, nullable=True)
    
    priority = db.Column(db.String(20), nullable=False, default='MEDIUM') # LOW, MEDIUM, HIGH, CRITICAL
    status = db.Column(db.String(20), nullable=False, default='SCHEDULED') # SCHEDULED, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
    
    technician_name = db.Column(db.String(120), nullable=False)
    technician_email = db.Column(db.String(120), nullable=True)
    
    scheduled_date = db.Column(db.Date, nullable=False, default=date.today)
    due_date = db.Column(db.Date, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        # Auto compute overdue if past due date and not completed/cancelled
        is_overdue = False
        if self.status in ['SCHEDULED', 'IN_PROGRESS'] and self.due_date < date.today():
            is_overdue = True

        return {
            'id': self.id,
            'plant_id': self.plant_id,
            'title': self.title,
            'equipment': self.equipment,
            'description': self.description,
            'priority': self.priority,
            'status': 'OVERDUE' if is_overdue and self.status != 'OVERDUE' else self.status,
            'technician_name': self.technician_name,
            'technician_email': self.technician_email,
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
