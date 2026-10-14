import uuid
from datetime import datetime, date
from app.models import db

class SolarPlant(db.Model):
    __tablename__ = 'solar_plants'

    id = db.Column(db.String(50), primary_key=True)  # e.g., 'PLANT-001'
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    
    # Capacity and equipment specs
    installed_capacity_kwp = db.Column(db.Float, nullable=False)  # kWp entered
    panel_count = db.Column(db.Integer, nullable=False)
    rated_panel_power_wp = db.Column(db.Float, nullable=False)    # Wp per module
    inverter_capacity_kw = db.Column(db.Float, nullable=False)    # Inverter rating
    panel_area_m2 = db.Column(db.Float, nullable=True)           # Total surface area in m²
    
    installation_date = db.Column(db.Date, nullable=False, default=date.today)
    
    # Financial & operational parameters
    electricity_tariff = db.Column(db.Float, nullable=False, default=7.50)      # Currency/kWh retail
    export_tariff = db.Column(db.Float, nullable=False, default=3.50)           # Currency/kWh feed-in
    self_consumption_pct = db.Column(db.Float, nullable=False, default=75.0)    # % self-consumed
    expected_pr = db.Column(db.Float, nullable=False, default=80.0)             # Target PR %
    low_gen_threshold_pct = db.Column(db.Float, nullable=False, default=65.0)   # Alert threshold %
    
    status = db.Column(db.String(20), nullable=False, default='ONLINE')  # ONLINE, OFFLINE, WARNING, CRITICAL
    is_demo_mode = db.Column(db.Boolean, default=True)
    api_key = db.Column(db.String(100), unique=True, nullable=False, default=lambda: f"key_{uuid.uuid4().hex}")
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    inverters = db.relationship('Inverter', backref='plant', cascade='all, delete-orphan', lazy=True)
    readings = db.relationship('GenerationReading', backref='plant', cascade='all, delete-orphan', lazy='dynamic')
    alerts = db.relationship('Alert', backref='plant', cascade='all, delete-orphan', lazy='dynamic')
    maintenance_tasks = db.relationship('MaintenanceTask', backref='plant', cascade='all, delete-orphan', lazy='dynamic')

    @property
    def calculated_capacity_kwp(self):
        """Calculates DC capacity from module count and individual rating (kWp)"""
        if self.panel_count and self.rated_panel_power_wp:
            return round((self.panel_count * self.rated_panel_power_wp) / 1000.0, 2)
        return self.installed_capacity_kwp

    @property
    def capacity_discrepancy(self):
        """Checks if user-entered installed capacity deviates from panel calculation"""
        calc = self.calculated_capacity_kwp
        diff = abs(calc - self.installed_capacity_kwp)
        if diff > 0.05:  # Tolerance threshold
            return {
                'has_discrepancy': True,
                'calculated_kwp': calc,
                'entered_kwp': self.installed_capacity_kwp,
                'difference_kwp': round(diff, 2),
                'message': f"Calculated capacity ({calc} kWp) differs from specified capacity ({self.installed_capacity_kwp} kWp)."
            }
        return {'has_discrepancy': False, 'calculated_kwp': calc, 'entered_kwp': self.installed_capacity_kwp, 'difference_kwp': 0.0}

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'location': self.location,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'installed_capacity_kwp': self.installed_capacity_kwp,
            'calculated_capacity_kwp': self.calculated_capacity_kwp,
            'capacity_discrepancy': self.capacity_discrepancy,
            'panel_count': self.panel_count,
            'rated_panel_power_wp': self.rated_panel_power_wp,
            'inverter_capacity_kw': self.inverter_capacity_kw,
            'panel_area_m2': self.panel_area_m2,
            'installation_date': self.installation_date.isoformat() if self.installation_date else None,
            'electricity_tariff': self.electricity_tariff,
            'export_tariff': self.export_tariff,
            'self_consumption_pct': self.self_consumption_pct,
            'expected_pr': self.expected_pr,
            'low_gen_threshold_pct': self.low_gen_threshold_pct,
            'status': self.status,
            'is_demo_mode': self.is_demo_mode,
            'api_key': self.api_key,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Inverter(db.Model):
    __tablename__ = 'inverters'

    id = db.Column(db.String(50), primary_key=True)  # e.g., 'INV-01'
    plant_id = db.Column(db.String(50), db.ForeignKey('solar_plants.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=True)
    rated_ac_power_kw = db.Column(db.Float, nullable=False)
    max_dc_voltage = db.Column(db.Float, default=1000.0)
    mppt_voltage_min = db.Column(db.Float, default=450.0)
    mppt_voltage_max = db.Column(db.Float, default=850.0)
    status = db.Column(db.String(20), default='ONLINE')  # ONLINE, OFFLINE, WARNING
    last_heartbeat = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'plant_id': self.plant_id,
            'name': self.name,
            'model': self.model,
            'rated_ac_power_kw': self.rated_ac_power_kw,
            'max_dc_voltage': self.max_dc_voltage,
            'mppt_voltage_min': self.mppt_voltage_min,
            'mppt_voltage_max': self.mppt_voltage_max,
            'status': self.status,
            'last_heartbeat': self.last_heartbeat.isoformat() if self.last_heartbeat else None
        }
