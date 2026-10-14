from datetime import datetime
from app.models import db

class WeatherRecord(db.Model):
    __tablename__ = 'weather_records'

    id = db.Column(db.Integer, primary_key=True)
    plant_id = db.Column(db.String(50), db.ForeignKey('solar_plants.id'), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Atmospheric metrics
    temperature_c = db.Column(db.Float, nullable=False)
    relative_humidity_pct = db.Column(db.Float, nullable=True)
    cloud_cover_pct = db.Column(db.Float, nullable=True)
    wind_speed_ms = db.Column(db.Float, nullable=True)
    precipitation_mm = db.Column(db.Float, nullable=True)
    
    # Solar radiation components
    global_horizontal_irradiance = db.Column(db.Float, nullable=False)  # GHI (W/m²)
    direct_normal_irradiance = db.Column(db.Float, nullable=True)       # DNI (W/m²)
    diffuse_horizontal_irradiance = db.Column(db.Float, nullable=True)  # DHI (W/m²)
    
    # Data provenance and caching
    weather_source = db.Column(db.String(50), nullable=False, default='OPEN_METEO') # OPEN_METEO, SIMULATED_CACHE
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'plant_id': self.plant_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'temperature_c': round(self.temperature_c, 1),
            'relative_humidity_pct': round(self.relative_humidity_pct, 1) if self.relative_humidity_pct is not None else None,
            'cloud_cover_pct': round(self.cloud_cover_pct, 1) if self.cloud_cover_pct is not None else None,
            'wind_speed_ms': round(self.wind_speed_ms, 1) if self.wind_speed_ms is not None else None,
            'precipitation_mm': round(self.precipitation_mm, 2) if self.precipitation_mm is not None else 0.0,
            'global_horizontal_irradiance': round(self.global_horizontal_irradiance, 1),
            'direct_normal_irradiance': round(self.direct_normal_irradiance, 1) if self.direct_normal_irradiance is not None else None,
            'weather_source': self.weather_source,
            'fetched_at': self.fetched_at.isoformat() if self.fetched_at else None
        }
