from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import db
from app.models.plant import SolarPlant, Inverter
from app.models.reading import GenerationReading
from app.models.alert import Alert
from app.services.simulation_service import simulate_telemetry_reading
from app.services.fault_engine import FaultEngine

live_bp = Blueprint('live', __name__, url_prefix='/api/live')

@live_bp.route('/status/<plant_id>', methods=['GET'])
@jwt_required()
def get_live_status(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    now = datetime.utcnow()
    inverters = Inverter.query.filter_by(plant_id=plant.id).all()

    if plant.is_demo_mode:
        # Mode A: Deterministic simulation for current moment
        sim_data = simulate_telemetry_reading(plant, now)
        
        # Calculate today's accumulated energy by aggregating today's existing records
        today_start = datetime.combine(now.date(), datetime.min.time())
        readings_today = GenerationReading.query.filter(
            GenerationReading.plant_id == plant.id,
            GenerationReading.timestamp >= today_start
        ).order_by(GenerationReading.timestamp.asc()).all()

        today_energy = sum([r.ac_power_kw for r in readings_today]) * (1.0 if len(readings_today) <= 24 else (24.0 / len(readings_today)))
        today_energy += sim_data['ac_power_kw'] * (now.minute / 60.0)

        current_reading = GenerationReading(
            plant_id=plant.id,
            inverter_id=inverters[0].id if inverters else 'INV-MAIN',
            timestamp=now,
            is_simulated=True,
            solar_irradiance_w_m2=sim_data['solar_irradiance_w_m2'],
            ambient_temperature_c=sim_data['ambient_temperature_c'],
            panel_temperature_c=sim_data['panel_temperature_c'],
            dc_voltage=sim_data['dc_voltage'],
            dc_current=sim_data['dc_current'],
            dc_power_kw=sim_data['dc_power_kw'],
            ac_voltage=sim_data['ac_voltage'],
            ac_current=sim_data['ac_current'],
            ac_power_kw=sim_data['ac_power_kw'],
            grid_frequency_hz=sim_data['grid_frequency_hz'],
            inverter_efficiency_pct=sim_data['inverter_efficiency_pct'],
            daily_energy_kwh=round(today_energy, 2),
            expected_power_kw=sim_data['expected_power_kw']
        )
        # Evaluate 8 fault rules
        FaultEngine.evaluate_reading(plant, current_reading, inverters)
        reading_dict = current_reading.to_dict()
        reading_dict['is_simulated'] = True
        reading_dict['data_source'] = 'DEMO_SIMULATED'
    else:
        # Mode B: Query physical telemetry from database
        latest = GenerationReading.query.filter_by(plant_id=plant.id).order_by(GenerationReading.timestamp.desc()).first()
        if not latest:
            return jsonify({
                'plant_id': plant.id,
                'status': 'OFFLINE',
                'message': 'No live telemetry received from physical monitoring gateway yet.',
                'data_source': 'PHYSICAL_DEVICE'
            }), 200

        reading_dict = latest.to_dict()
        reading_dict['is_simulated'] = False
        reading_dict['data_source'] = 'PHYSICAL_DEVICE'
        # Evaluate stale status
        age_sec = (now - latest.timestamp).total_seconds()
        if age_sec > 600:
            reading_dict['is_stale'] = True

    # Check active critical alerts to determine plant status
    active_critical = Alert.query.filter_by(plant_id=plant.id, status='ACTIVE', severity='CRITICAL').count()
    active_warnings = Alert.query.filter_by(plant_id=plant.id, status='ACTIVE', severity='WARNING').count()

    overall_status = 'ONLINE'
    if active_critical > 0:
        overall_status = 'CRITICAL'
    elif active_warnings > 0:
        overall_status = 'WARNING'
    elif reading_dict.get('ac_power_kw', 0) == 0 and (6 <= now.hour <= 18):
        overall_status = 'WARNING'

    return jsonify({
        'plant_id': plant.id,
        'plant_name': plant.name,
        'installed_capacity_kwp': plant.installed_capacity_kwp,
        'overall_status': overall_status,
        'telemetry': reading_dict,
        'active_alerts_count': active_critical + active_warnings
    }), 200

@live_bp.route('/today/<plant_id>', methods=['GET'])
@jwt_required()
def get_today_curve(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), datetime.min.time())
    
    # Query today's persisted readings
    readings = GenerationReading.query.filter(
        GenerationReading.plant_id == plant.id,
        GenerationReading.timestamp >= today_start
    ).order_by(GenerationReading.timestamp.asc()).all()

    points = []
    for r in readings:
        points.append({
            'time': r.timestamp.strftime('%H:%M'),
            'timestamp': r.timestamp.isoformat(),
            'actual_power_kw': round(r.ac_power_kw, 2),
            'expected_power_kw': round(r.expected_power_kw or 0.0, 2),
            'solar_irradiance': round(r.solar_irradiance_w_m2, 1),
            'panel_temp': round(r.panel_temperature_c, 1)
        })

    # If plant is in demo mode and has fewer than 24 points today, synthesize the rest of today
    if plant.is_demo_mode and len(points) < 24:
        for hour in range(len(points), 24):
            t = today_start + timedelta(hours=hour)
            sim = simulate_telemetry_reading(plant, t)
            points.append({
                'time': t.strftime('%H:%M'),
                'timestamp': t.isoformat(),
                'actual_power_kw': round(sim['ac_power_kw'], 2),
                'expected_power_kw': round(sim['expected_power_kw'], 2),
                'solar_irradiance': round(sim['solar_irradiance_w_m2'], 1),
                'panel_temp': round(sim['panel_temperature_c'], 1)
            })

    return jsonify({
        'plant_id': plant.id,
        'date': now.strftime('%Y-%m-%d'),
        'data_source': 'DEMO_SIMULATED' if plant.is_demo_mode else 'PHYSICAL_GATEWAY',
        'points': points
    }), 200

@live_bp.route('/ingest', methods=['POST'])
def ingest_telemetry():
    """
    Mode B: Secure API for external monitoring hardware or IoT gateways.
    Requires header X-Plant-Key with valid plant api_key.
    """
    api_key = request.headers.get('X-Plant-Key') or request.headers.get('X-Device-Key')
    if not api_key:
        return jsonify({'error': 'Missing authentication key header (X-Plant-Key)'}), 401

    plant = SolarPlant.query.filter_by(api_key=api_key).first()
    if not plant:
        return jsonify({'error': 'Invalid device authentication key'}), 403

    payload = request.get_json() or {}
    
    # Input validation
    required_fields = ['dc_voltage', 'dc_current', 'ac_voltage', 'ac_power_kw']
    for rf in required_fields:
        if rf not in payload:
            return jsonify({'error': f'Field {rf} is required'}), 400

    try:
        dc_v = float(payload['dc_voltage'])
        dc_i = float(payload['dc_current'])
        ac_v = float(payload['ac_voltage'])
        ac_kw = float(payload['ac_power_kw'])
        irradiance = float(payload.get('solar_irradiance_w_m2', 0.0))
        panel_t = float(payload.get('panel_temperature_c', 25.0))
        amb_t = float(payload.get('ambient_temperature_c', 25.0))
        freq = float(payload.get('grid_frequency_hz', 50.0))
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid numerical reading values in payload'}), 400

    # Range plausibility checks
    if dc_v < 0 or dc_i < 0 or ac_v < 0 or ac_kw < 0 or irradiance < 0:
        return jsonify({'error': 'Telemetry values cannot be negative'}), 400
    if freq < 40.0 or freq > 70.0:
        return jsonify({'error': 'Grid frequency out of plausible physical limits (40-70 Hz)'}), 400

    dc_kw = (dc_v * dc_i) / 1000.0
    eff = (ac_kw / dc_kw * 100.0) if dc_kw > 0.1 else 0.0

    reading = GenerationReading(
        plant_id=plant.id,
        inverter_id=payload.get('inverter_id', 'INV-01'),
        timestamp=datetime.utcnow(),
        is_simulated=False,
        dc_voltage=round(dc_v, 2),
        dc_current=round(dc_i, 2),
        dc_power_kw=round(dc_kw, 2),
        ac_voltage=round(ac_v, 2),
        ac_current=round(payload.get('ac_current', (ac_kw * 1000 / (1.732 * ac_v))), 2) if ac_v > 0 else 0.0,
        ac_power_kw=round(ac_kw, 2),
        grid_frequency_hz=round(freq, 2),
        solar_irradiance_w_m2=round(irradiance, 1),
        panel_temperature_c=round(panel_t, 1),
        ambient_temperature_c=round(amb_t, 1),
        inverter_efficiency_pct=round(min(100.0, eff), 2),
        daily_energy_kwh=float(payload.get('daily_energy_kwh', 0.0))
    )

    db.session.add(reading)
    # Check faults
    FaultEngine.evaluate_reading(plant, reading)
    db.session.commit()

    return jsonify({
        'status': 'INGESTED',
        'reading_id': reading.id,
        'timestamp': reading.timestamp.isoformat()
    }), 201
