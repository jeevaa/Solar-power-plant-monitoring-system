from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from app.models.user import User
from app.models.plant import SolarPlant, Inverter
from app.models.reading import GenerationReading
from app.models.weather import WeatherRecord
from app.models.alert import Alert
from app.models.maintenance import MaintenanceTask
from app.models.settings import SystemSetting

__all__ = [
    'db',
    'User',
    'SolarPlant',
    'Inverter',
    'GenerationReading',
    'WeatherRecord',
    'Alert',
    'MaintenanceTask',
    'SystemSetting'
]
