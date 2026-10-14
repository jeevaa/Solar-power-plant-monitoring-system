import uuid
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import db
from app.models.plant import SolarPlant, Inverter
from app.utils.auth_helpers import admin_required

plants_bp = Blueprint('plants', __name__, url_prefix='/api/plants')

@plants_bp.route('', methods=['GET'])
@jwt_required()
def list_plants():
    plants = SolarPlant.query.order_by(SolarPlant.id.asc()).all()
    return jsonify({'plants': [p.to_dict() for p in plants]}), 200

@plants_bp.route('/<plant_id>', methods=['GET'])
@jwt_required()
def get_plant(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    inverters = Inverter.query.filter_by(plant_id=plant.id).all()
    plant_data = plant.to_dict()
    plant_data['inverters'] = [inv.to_dict() for inv in inverters]
    return jsonify({'plant': plant_data}), 200

@plants_bp.route('', methods=['POST'])
@admin_required
def create_plant():
    data = request.get_json() or {}
    
    plant_id = data.get('id', '').strip()
    name = data.get('name', '').strip()
    location = data.get('location', '').strip()
    
    if not plant_id or not name or not location:
        return jsonify({'error': 'Plant ID, Name, and Location are mandatory'}), 400

    if SolarPlant.query.get(plant_id):
        return jsonify({'error': f'Plant with ID {plant_id} already exists'}), 409

    try:
        latitude = float(data.get('latitude', 0.0))
        longitude = float(data.get('longitude', 0.0))
        installed_capacity_kwp = float(data.get('installed_capacity_kwp', 0.0))
        panel_count = int(data.get('panel_count', 0))
        rated_panel_power_wp = float(data.get('rated_panel_power_wp', 0.0))
        inverter_capacity_kw = float(data.get('inverter_capacity_kw', 0.0))
    except (ValueError, TypeError) as e:
        return jsonify({'error': 'Numerical values required for technical parameters', 'details': str(e)}), 400

    if installed_capacity_kwp <= 0 or panel_count <= 0 or rated_panel_power_wp <= 0:
        return jsonify({'error': 'Capacity, panel count, and panel rating must be greater than zero'}), 400

    # Parse installation date
    install_date_val = date.today()
    if data.get('installation_date'):
        try:
            install_date_val = datetime.strptime(data.get('installation_date'), '%Y-%m-%d').date()
        except ValueError:
            pass

    # Optional total area calculation if not specified: approx 2.05 m² per 400W panel
    panel_area_m2 = data.get('panel_area_m2')
    if panel_area_m2:
        panel_area_m2 = float(panel_area_m2)
    else:
        panel_area_m2 = round(panel_count * 2.05, 1)

    new_plant = SolarPlant(
        id=plant_id,
        name=name,
        description=data.get('description', ''),
        location=location,
        latitude=latitude,
        longitude=longitude,
        installed_capacity_kwp=installed_capacity_kwp,
        panel_count=panel_count,
        rated_panel_power_wp=rated_panel_power_wp,
        inverter_capacity_kw=inverter_capacity_kw,
        panel_area_m2=panel_area_m2,
        installation_date=install_date_val,
        electricity_tariff=float(data.get('electricity_tariff', 7.50)),
        export_tariff=float(data.get('export_tariff', 3.50)),
        self_consumption_pct=float(data.get('self_consumption_pct', 75.0)),
        expected_pr=float(data.get('expected_pr', 80.0)),
        low_gen_threshold_pct=float(data.get('low_gen_threshold_pct', 65.0)),
        status=data.get('status', 'ONLINE'),
        is_demo_mode=bool(data.get('is_demo_mode', True)),
        api_key=f"key_{uuid.uuid4().hex}"
    )

    db.session.add(new_plant)
    
    # Auto-create a default inverter if requested
    inv = Inverter(
        id=f"INV-{plant_id[-3:]}-01",
        plant_id=plant_id,
        name=f"{name} Primary Inverter",
        model='Central Solar Inverter',
        rated_ac_power_kw=inverter_capacity_kw,
        status='ONLINE'
    )
    db.session.add(inv)
    db.session.commit()

    return jsonify({
        'message': 'Solar plant created successfully',
        'plant': new_plant.to_dict(),
        'discrepancy_warning': new_plant.capacity_discrepancy
    }), 201

@plants_bp.route('/<plant_id>', methods=['PUT'])
@admin_required
def update_plant(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    data = request.get_json() or {}
    
    if 'name' in data: plant.name = data['name']
    if 'description' in data: plant.description = data['description']
    if 'location' in data: plant.location = data['location']
    if 'latitude' in data: plant.latitude = float(data['latitude'])
    if 'longitude' in data: plant.longitude = float(data['longitude'])
    if 'installed_capacity_kwp' in data: plant.installed_capacity_kwp = float(data['installed_capacity_kwp'])
    if 'panel_count' in data: plant.panel_count = int(data['panel_count'])
    if 'rated_panel_power_wp' in data: plant.rated_panel_power_wp = float(data['rated_panel_power_wp'])
    if 'inverter_capacity_kw' in data: plant.inverter_capacity_kw = float(data['inverter_capacity_kw'])
    if 'panel_area_m2' in data and data['panel_area_m2']: plant.panel_area_m2 = float(data['panel_area_m2'])
    if 'electricity_tariff' in data: plant.electricity_tariff = float(data['electricity_tariff'])
    if 'export_tariff' in data: plant.export_tariff = float(data['export_tariff'])
    if 'self_consumption_pct' in data: plant.self_consumption_pct = float(data['self_consumption_pct'])
    if 'expected_pr' in data: plant.expected_pr = float(data['expected_pr'])
    if 'low_gen_threshold_pct' in data: plant.low_gen_threshold_pct = float(data['low_gen_threshold_pct'])
    if 'status' in data: plant.status = data['status']
    if 'is_demo_mode' in data: plant.is_demo_mode = bool(data['is_demo_mode'])

    db.session.commit()
    return jsonify({
        'message': 'Solar plant updated successfully',
        'plant': plant.to_dict(),
        'discrepancy_warning': plant.capacity_discrepancy
    }), 200

@plants_bp.route('/<plant_id>', methods=['DELETE'])
@admin_required
def delete_plant(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    db.session.delete(plant)
    db.session.commit()
    return jsonify({'message': f'Solar plant {plant_id} deleted successfully'}), 200

@plants_bp.route('/<plant_id>/regenerate-key', methods=['POST'])
@admin_required
def regenerate_key(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    plant.api_key = f"key_{uuid.uuid4().hex}"
    db.session.commit()
    return jsonify({'message': 'API key regenerated', 'api_key': plant.api_key}), 200
