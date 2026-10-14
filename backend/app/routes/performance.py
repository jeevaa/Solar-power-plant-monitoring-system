from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.plant import SolarPlant
from app.models.reading import GenerationReading
from app.utils.math_helpers import integrate_power_to_energy
from app.services.calculations import (
    calculate_specific_yield,
    calculate_performance_ratio,
    calculate_panel_efficiency,
    calculate_plant_availability
)

performance_bp = Blueprint('performance', __name__, url_prefix='/api/performance')

@performance_bp.route('/<plant_id>', methods=['GET'])
@jwt_required()
def get_performance_analysis(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    period = request.args.get('period', '30d') # today, 7d, 30d
    now = datetime.utcnow()
    
    if period == 'today':
        start_dt = datetime.combine(now.date(), datetime.min.time())
    elif period == '7d':
        start_dt = datetime.combine((now - timedelta(days=6)).date(), datetime.min.time())
    else:
        start_dt = datetime.combine((now - timedelta(days=29)).date(), datetime.min.time())

    readings = GenerationReading.query.filter(
        GenerationReading.plant_id == plant.id,
        GenerationReading.timestamp >= start_dt
    ).order_by(GenerationReading.timestamp.asc()).all()

    # 1. Actual AC Energy (kWh) via numerical integration
    ac_points = [{'timestamp': r.timestamp, 'power_kw': r.ac_power_kw} for r in readings]
    actual_ac_energy_kwh = integrate_power_to_energy(ac_points, max_gap_seconds=3600)

    # 2. Reference Solar Irradiation (kWh/m²)
    # Irradiance points (W/m²) converted to kW/m² by dividing by 1000, then integrated over time
    ghi_points = [{'timestamp': r.timestamp, 'power_kw': (r.solar_irradiance_w_m2 / 1000.0)} for r in readings]
    ref_irradiation_kwh_m2 = integrate_power_to_energy(ghi_points, max_gap_seconds=3600)

    # 3. Expected Energy (kWh) based on expected_power_kw
    exp_points = [{'timestamp': r.timestamp, 'power_kw': (r.expected_power_kw or 0.0)} for r in readings]
    expected_energy_kwh = integrate_power_to_energy(exp_points, max_gap_seconds=3600)
    if expected_energy_kwh == 0.0 and plant.installed_capacity_kwp > 0:
        # Benchmark estimate based on peak sun hours
        expected_energy_kwh = round(plant.installed_capacity_kwp * ref_irradiation_kwh_m2 * (plant.expected_pr / 100.0), 2)

    # Specific Yield (kWh/kWp)
    specific_yield = calculate_specific_yield(actual_ac_energy_kwh, plant.installed_capacity_kwp)

    # Performance Ratio (%)
    pr_eval = calculate_performance_ratio(actual_ac_energy_kwh, plant.installed_capacity_kwp, ref_irradiation_kwh_m2)

    # Panel Efficiency (%) from latest daytime reading
    latest_daytime = None
    for r in reversed(readings):
        if r.solar_irradiance_w_m2 > 100.0 and r.dc_power_kw > 1.0:
            latest_daytime = r
            break

    if latest_daytime:
        dc_watts = latest_daytime.dc_power_kw * 1000.0
        eff_eval = calculate_panel_efficiency(dc_watts, latest_daytime.solar_irradiance_w_m2, plant.panel_area_m2)
    else:
        eff_eval = {
            'efficiency_pct': 20.4,
            'is_valid': True,
            'reason': "Nighttime or low-light standby. Showing standard nominal module STC efficiency."
        }

    # Expected vs Actual deviation
    abs_diff_kwh = round(actual_ac_energy_kwh - expected_energy_kwh, 2)
    pct_deviation = round((abs_diff_kwh / expected_energy_kwh * 100.0), 2) if expected_energy_kwh > 0 else 0.0

    # Availability
    daylight_count = sum(1 for r in readings if r.solar_irradiance_w_m2 > 50.0)
    operational_count = sum(1 for r in readings if r.solar_irradiance_w_m2 > 50.0 and r.ac_power_kw > 1.0)
    availability_pct = calculate_plant_availability(operational_count, daylight_count)

    # Performance Category
    pr_val = pr_eval.get('pr_pct') or plant.expected_pr
    if pr_val >= plant.expected_pr:
        perf_category = {'status': 'EXCELLENT', 'label': 'Optimal Generation', 'color': 'text-emerald-600'}
    elif pr_val >= plant.expected_pr - 10.0:
        perf_category = {'status': 'NOMINAL', 'label': 'Nominal Operational State', 'color': 'text-blue-600'}
    elif pr_val >= plant.expected_pr - 20.0:
        perf_category = {'status': 'DEGRADED', 'label': 'Mild Performance Derating', 'color': 'text-amber-600'}
    else:
        perf_category = {'status': 'CRITICAL', 'label': 'Severe Anomaly / Soiling', 'color': 'text-red-600'}

    # Historical Daily PR Trend
    daily_trend = []
    daily_groups = {}
    for r in readings:
        d_str = r.timestamp.strftime('%Y-%m-%d')
        if d_str not in daily_groups: daily_groups[d_str] = []
        daily_groups[d_str].append(r)

    for d_str, day_recs in sorted(daily_groups.items()):
        day_ac = integrate_power_to_energy([{'timestamp': x.timestamp, 'power_kw': x.ac_power_kw} for x in day_recs], 3600)
        day_ghi = integrate_power_to_energy([{'timestamp': x.timestamp, 'power_kw': (x.solar_irradiance_w_m2 / 1000.0)} for x in day_recs], 3600)
        day_pr = calculate_performance_ratio(day_ac, plant.installed_capacity_kwp, day_ghi)
        daily_trend.append({
            'date': d_str,
            'pr_pct': day_pr.get('pr_pct') if day_pr.get('is_valid') else plant.expected_pr,
            'specific_yield': round(day_ac / plant.installed_capacity_kwp, 2) if plant.installed_capacity_kwp > 0 else 0.0,
            'expected_pr': plant.expected_pr
        })

    return jsonify({
        'plant_id': plant.id,
        'period': period,
        'actual_ac_energy_kwh': actual_ac_energy_kwh,
        'expected_energy_kwh': expected_energy_kwh,
        'energy_deviation_kwh': abs_diff_kwh,
        'energy_deviation_pct': pct_deviation,
        'specific_yield_kwh_kwp': specific_yield,
        'performance_ratio': pr_eval,
        'panel_efficiency': eff_eval,
        'plant_availability_pct': availability_pct,
        'performance_category': perf_category,
        'daily_trend': daily_trend,
        'reference_irradiation_kwh_m2': ref_irradiation_kwh_m2
    }), 200
