from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models.plant import SolarPlant
from app.services.weather_service import WeatherService

weather_bp = Blueprint('weather', __name__, url_prefix='/api/weather')

@weather_bp.route('/<plant_id>', methods=['GET'])
@jwt_required()
def get_plant_weather(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    weather_data = WeatherService.get_weather(plant.latitude, plant.longitude, plant_id=plant.id)
    weather_data['plant_id'] = plant.id
    weather_data['plant_name'] = plant.name
    weather_data['location'] = plant.location
    weather_data['latitude'] = plant.latitude
    weather_data['longitude'] = plant.longitude

    return jsonify(weather_data), 200
