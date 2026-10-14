from datetime import datetime
from app.models import db

class GenerationReading(db.Model):
    __tablename__ = 'generation_readings'

    id = db.Column(db.Integer, primary_key=True)
    plant_id = db.Column(db.String(50), db.ForeignKey('solar_plants.id'), nullable=False, index=True)
    inverter_id = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Telemetry data source distinction
    is_simulated = db.Column(db.Boolean, default=True, nullable=False)
    
    # DC side electrical parameters
    dc_voltage = db.Column(db.Float, nullable=False)           # Volts (V)
    dc_current = db.Column(db.Float, nullable=False)           # Amperes (A)
    dc_power_kw = db.Column(db.Float, nullable=False)          # Kilowatts (kW)
    
    # AC side electrical parameters
    ac_voltage = db.Column(db.Float, nullable=False)           # Volts (V, Line-to-Line)
    ac_current = db.Column(db.Float, nullable=False)           # Amperes (A)
    ac_power_kw = db.Column(db.Float, nullable=False)          # Kilowatts (kW)
    grid_frequency_hz = db.Column(db.Float, nullable=False)    # Hertz (Hz, nominal 50/60)
    
    # Environmental and thermal parameters
    solar_irradiance_w_m2 = db.Column(db.Float, nullable=False)  # W/m² (GHI / POA)
    panel_temperature_c = db.Column(db.Float, nullable=False)    # °C
    ambient_temperature_c = db.Column(db.Float, nullable=False)  # °C
    
    # Performance indicators
    inverter_efficiency_pct = db.Column(db.Float, nullable=False)  # %
    daily_energy_kwh = db.Column(db.Float, nullable=False, default=0.0) # Accumulated today (kWh)
    expected_power_kw = db.Column(db.Float, nullable=True)         # Model reference power (kW)

    def to_dict(self):
        return {
            'id': self.id,
            'plant_id': self.plant_id,
            'inverter_id': self.inverter_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'is_simulated': self.is_simulated,
            'dc_voltage': round(self.dc_voltage, 2),
            'dc_current': round(self.dc_current, 2),
            'dc_power_kw': round(self.dc_power_kw, 2),
            'ac_voltage': round(self.ac_voltage, 2),
            'ac_current': round(self.ac_current, 2),
            'ac_power_kw': round(self.ac_power_kw, 2),
            'grid_frequency_hz': round(self.grid_frequency_hz, 2),
            'solar_irradiance_w_m2': round(self.solar_irradiance_w_m2, 1),
            'panel_temperature_c': round(self.panel_temperature_c, 1),
            'ambient_temperature_c': round(self.ambient_temperature_c, 1),
            'inverter_efficiency_pct': round(self.inverter_efficiency_pct, 2),
            'daily_energy_kwh': round(self.daily_energy_kwh, 2),
            'expected_power_kw': round(self.expected_power_kw, 2) if self.expected_power_kw is not None else None
        }
