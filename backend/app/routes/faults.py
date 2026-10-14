from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.plant import SolarPlant
from app.models.reading import GenerationReading
from app.models.alert import Alert
from app.services.simulation_service import simulate_telemetry_reading
from app.services.fault_engine import FaultEngine
from app.utils.auth_helpers import operator_required

faults_bp = Blueprint('faults', __name__, url_prefix='/api/faults')

RULES_DOCUMENTATION = [
    {
        'rule_id': 'RULE-1',
        'type': 'LOW_POWER_OUTPUT',
        'name': 'Low Power Output vs Expected Model',
        'condition': 'AC Power < (Expected Power × Low Generation Threshold %) during valid daylight (Irradiance > 150 W/m²)',
        'default_severity': 'WARNING / CRITICAL',
        'physics_note': 'Checks physical irradiance curve; suppresses false triggers at nighttime or dawn/dusk.'
    },
    {
        'rule_id': 'RULE-2',
        'type': 'INVERTER_OFFLINE',
        'name': 'Inverter Gateway Heartbeat Timeout',
        'condition': 'Inverter status is OFFLINE or last heartbeat age > 300 seconds',
        'default_severity': 'CRITICAL',
        'physics_note': 'Detects inverter communication interruption or AC contactor trip.'
    },
    {
        'rule_id': 'RULE-3',
        'type': 'ABNORMAL_PANEL_TEMP',
        'name': 'Abnormal PV Module Temperature',
        'condition': 'Measured cell/backsheet temperature > 65.0°C (Warning) or > 75.0°C (Critical)',
        'default_severity': 'WARNING / CRITICAL',
        'physics_note': 'High thermal stress increases cell degradation and causes severe power derating (-0.38%/°C).'
    },
    {
        'rule_id': 'RULE-4',
        'type': 'DC_VOLTAGE_OUT_OF_RANGE',
        'name': 'DC Bus Voltage Outside MPPT Window',
        'condition': 'DC Voltage < 450V or > 880V during active generation',
        'default_severity': 'WARNING',
        'physics_note': 'Identifies string decoupling, blown series fuses, or MPPT algorithm instability.'
    },
    {
        'rule_id': 'RULE-5',
        'type': 'AC_OUTPUT_ANOMALY',
        'name': 'AC Voltage / Frequency Grid Anomaly',
        'condition': 'AC Voltage outside 380V - 445V OR Grid Frequency outside 49.2Hz - 50.8Hz',
        'default_severity': 'WARNING / CRITICAL',
        'physics_note': 'Monitors IEEE 1547 / IEC 61727 grid interconnect compliance.'
    },
    {
        'rule_id': 'RULE-6',
        'type': 'LOW_DAILY_GENERATION',
        'name': 'Sub-Target Accumulated Daily Generation',
        'condition': 'Accumulated kWh at 16:00 is below 2.8 kWh/kWp seasonal benchmark',
        'default_severity': 'WARNING',
        'physics_note': 'Evaluates cumulative yield deficits caused by persistent cloud cover or soiling.'
    },
    {
        'rule_id': 'RULE-7',
        'type': 'SENSOR_DATA_STALE',
        'name': 'Telemetry Feed Stale / Latency Violation',
        'condition': 'In physical gateway mode, no new packet received for > 600 seconds',
        'default_severity': 'WARNING',
        'physics_note': 'Detects sensor transceiver lag or RS-485 Modbus packet drops.'
    },
    {
        'rule_id': 'RULE-8',
        'type': 'ABNORMAL_PERFORMANCE_RATIO',
        'name': 'Depressed Operational Performance Ratio',
        'condition': 'Instantaneous daytime PR < 55% during high irradiance (> 400 W/m²)',
        'default_severity': 'WARNING',
        'physics_note': 'Signals severe dust/bird soiling, partial string shading, or mismatch losses.'
    }
]

@faults_bp.route('/<plant_id>', methods=['GET'])
@jwt_required()
def get_fault_status(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    # Active alerts for this plant
    active_alerts = Alert.query.filter_by(plant_id=plant.id, status='ACTIVE').order_by(Alert.detection_timestamp.desc()).all()
    recent_resolved = Alert.query.filter_by(plant_id=plant.id, status='RESOLVED').order_by(Alert.resolved_at.desc()).limit(5).all()

    return jsonify({
        'plant_id': plant.id,
        'rules': RULES_DOCUMENTATION,
        'active_alerts': [a.to_dict() for a in active_alerts],
        'recent_resolved': [a.to_dict() for a in recent_resolved],
        'total_active_faults': len(active_alerts)
    }), 200

@faults_bp.route('/simulate', methods=['POST'])
@operator_required
def trigger_fault_simulation():
    data = request.get_json() or {}
    plant_id = data.get('plant_id')
    fault_type = data.get('fault_type') # LOW_POWER, HIGH_TEMP, VOLTAGE_FAULT

    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404

    now = datetime.utcnow()
    # Force simulated reading with injected fault condition
    sim_data = simulate_telemetry_reading(plant, now, fault_mode=fault_type)
    reading = GenerationReading(
        plant_id=plant.id,
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
        daily_energy_kwh=120.0,
        expected_power_kw=sim_data['expected_power_kw']
    )
    
    # Run fault rules engine
    alerts_created = FaultEngine.evaluate_reading(plant, reading)

    return jsonify({
        'message': f'Fault condition {fault_type} evaluated by rule engine',
        'reading': reading.to_dict(),
        'alerts_created': [a.to_dict() for a in alerts_created]
    }), 200
