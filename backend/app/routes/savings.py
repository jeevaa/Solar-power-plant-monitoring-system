from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.plant import SolarPlant
from app.models.reading import GenerationReading
from app.utils.math_helpers import integrate_power_to_energy
from app.services.savings_service import SavingsService
from app.config import Config

savings_bp = Blueprint('savings', __name__, url_prefix='/api/savings')

@savings_bp.route('/<plant_id>', methods=['GET'])
@jwt_required()
def get_cost_savings(plant_id):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    now = datetime.utcnow()
    
    # 1. Today's energy
    today_start = datetime.combine(now.date(), datetime.min.time())
    today_readings = GenerationReading.query.filter(
        GenerationReading.plant_id == plant.id,
        GenerationReading.timestamp >= today_start
    ).all()
    today_kwh = integrate_power_to_energy([{'timestamp': r.timestamp, 'power_kw': r.ac_power_kw} for r in today_readings], 3600)

    # 2. Past 30 Days (Monthly)
    month_start = datetime.combine((now - timedelta(days=29)).date(), datetime.min.time())
    month_readings = GenerationReading.query.filter(
        GenerationReading.plant_id == plant.id,
        GenerationReading.timestamp >= month_start
    ).all()
    month_kwh = integrate_power_to_energy([{'timestamp': r.timestamp, 'power_kw': r.ac_power_kw} for r in month_readings], 3600)

    # 3. All-time / Historical energy
    all_readings = GenerationReading.query.filter_by(plant_id=plant.id).all()
    total_kwh = integrate_power_to_energy([{'timestamp': r.timestamp, 'power_kw': r.ac_power_kw} for r in all_readings], 3600)

    # Calculate savings using plant configured tariffs
    today_calc = SavingsService.calculate_savings(
        today_kwh, plant.electricity_tariff, plant.export_tariff, plant.self_consumption_pct
    )
    month_calc = SavingsService.calculate_savings(
        month_kwh, plant.electricity_tariff, plant.export_tariff, plant.self_consumption_pct
    )
    total_calc = SavingsService.calculate_savings(
        total_kwh, plant.electricity_tariff, plant.export_tariff, plant.self_consumption_pct
    )

    # Annualized estimate: 365 * daily average
    days_recorded = max(1, len(set([r.timestamp.date() for r in all_readings])))
    daily_avg_kwh = total_kwh / days_recorded
    annual_kwh = daily_avg_kwh * 365.0
    annual_calc = SavingsService.calculate_savings(
        annual_kwh, plant.electricity_tariff, plant.export_tariff, plant.self_consumption_pct
    )

    # Baseline comparison: Cost of purchasing equivalent electricity from grid without solar
    grid_baseline_cost = round(total_kwh * plant.electricity_tariff, 2)
    net_savings_vs_grid = round(total_calc['total_estimated_benefit'], 2)

    return jsonify({
        'plant_id': plant.id,
        'currency_symbol': Config.DEFAULT_CURRENCY,
        'tariffs': {
            'retail_tariff': plant.electricity_tariff,
            'export_tariff': plant.export_tariff,
            'self_consumption_pct': plant.self_consumption_pct
        },
        'today': today_calc,
        'past_30_days': month_calc,
        'annualized_estimate': annual_calc,
        'historical_total': total_calc,
        'baseline_comparison': {
            'grid_baseline_cost': grid_baseline_cost,
            'net_savings_realized': net_savings_vs_grid,
            'description': "Without solar generation, importing equivalent power from utility would have incurred retail grid tariff charges."
        },
        'formula_explanation': {
            'self_consumption': 'Self-Consumed kWh = Total Solar kWh × Self-Consumption %',
            'self_savings': 'Self-Consumption Savings = Self-Consumed kWh × Retail Tariff',
            'export_credit': 'Export Credit = (Total kWh − Self-Consumed kWh) × Export Tariff',
            'total_benefit': 'Total Estimated Benefit = Self-Consumption Savings + Export Credit'
        }
    }), 200
