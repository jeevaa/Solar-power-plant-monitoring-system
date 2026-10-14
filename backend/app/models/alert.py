from datetime import datetime
from app.models import db

class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    plant_id = db.Column(db.String(50), db.ForeignKey('solar_plants.id'), nullable=False, index=True)
    device_id = db.Column(db.String(50), nullable=True) # e.g., 'INV-01', 'STRING-4'
    
    alert_type = db.Column(db.String(50), nullable=False, index=True) 
    # Types:
    # LOW_POWER_OUTPUT, INVERTER_OFFLINE, ABNORMAL_PANEL_TEMP,
    # DC_VOLTAGE_OUT_OF_RANGE, AC_OUTPUT_ANOMALY, LOW_DAILY_GENERATION,
    # SENSOR_DATA_STALE, ABNORMAL_PERFORMANCE_RATIO
    
    severity = db.Column(db.String(20), nullable=False, default='WARNING') # INFO, WARNING, CRITICAL
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    detection_timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    measured_value = db.Column(db.String(100), nullable=True)
    expected_value = db.Column(db.String(100), nullable=True)
    
    status = db.Column(db.String(20), nullable=False, default='ACTIVE') # ACTIVE, ACKNOWLEDGED, RESOLVED
    
    acknowledged_by = db.Column(db.String(120), nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    
    resolved_by = db.Column(db.String(120), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'plant_id': self.plant_id,
            'device_id': self.device_id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'title': self.title,
            'description': self.description,
            'detection_timestamp': self.detection_timestamp.isoformat() if self.detection_timestamp else None,
            'measured_value': self.measured_value,
            'expected_value': self.expected_value,
            'status': self.status,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'resolved_by': self.resolved_by,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolution_notes': self.resolution_notes
        }
