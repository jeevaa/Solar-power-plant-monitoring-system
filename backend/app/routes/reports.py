from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from app.models.plant import SolarPlant
from app.models.reading import GenerationReading
from app.models.alert import Alert
from app.models.maintenance import MaintenanceTask
from app.utils.math_helpers import integrate_power_to_energy
from app.services.calculations import calculate_specific_yield, calculate_performance_ratio
from app.services.savings_service import SavingsService
from app.services.report_service import ReportService

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

def _gather_report_data(plant_id, report_type, start_date_str, end_date_str):
    plant = SolarPlant.query.get(plant_id)
    if not plant:
        return None, None

    now = datetime.utcnow()
    
    if start_date_str and end_date_str:
        try:
            s_d = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            e_d = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            start_dt = datetime.combine(s_d, datetime.min.time())
            end_dt = datetime.combine(e_d, datetime.max.time())
        except ValueError:
            start_dt = datetime.combine((now - timedelta(days=30)).date(), datetime.min.time())
            end_dt = datetime.combine(now.date(), datetime.max.time())
    else:
        if report_type == 'daily':
            start_dt = datetime.combine(now.date(), datetime.min.time())
            end_dt = datetime.combine(now.date(), datetime.max.time())
        elif report_type == 'weekly':
            start_dt = datetime.combine((now - timedelta(days=6)).date(), datetime.min.time())
            end_dt = datetime.combine(now.date(), datetime.max.time())
        elif report_type == 'monthly':
            start_dt = datetime.combine(now.date().replace(day=1), datetime.min.time())
            end_dt = datetime.combine(now.date(), datetime.max.time())
        elif report_type == 'annual':
            start_dt = datetime.combine(now.date().replace(month=1, day=1), datetime.min.time())
            end_dt = datetime.combine(now.date(), datetime.max.time())
        else:
            start_dt = datetime.combine((now - timedelta(days=29)).date(), datetime.min.time())
            end_dt = datetime.combine(now.date(), datetime.max.time())

    # Telemetry records
    readings = GenerationReading.query.filter(
        GenerationReading.plant_id == plant.id,
        GenerationReading.timestamp >= start_dt,
        GenerationReading.timestamp <= end_dt
    ).order_by(GenerationReading.timestamp.asc()).all()

    # Energy calculations
    ac_points = [{'timestamp': r.timestamp, 'power_kw': r.ac_power_kw} for r in readings]
    total_energy_kwh = integrate_power_to_energy(ac_points, 3600)
    
    ghi_points = [{'timestamp': r.timestamp, 'power_kw': (r.solar_irradiance_w_m2 / 1000.0)} for r in readings]
    ref_irradiation_kwh_m2 = integrate_power_to_energy(ghi_points, 3600)
    
    specific_yield = calculate_specific_yield(total_energy_kwh, plant.installed_capacity_kwp)
    pr_eval = calculate_performance_ratio(total_energy_kwh, plant.installed_capacity_kwp, ref_irradiation_kwh_m2)

    unique_days = len(set([r.timestamp.date() for r in readings])) or 1
    daily_avg_kwh = round(total_energy_kwh / unique_days, 1)
    peak_power = max([r.ac_power_kw for r in readings], default=0.0)

    summary_metrics = {
        'total_energy_kwh': total_energy_kwh,
        'daily_avg_kwh': daily_avg_kwh,
        'peak_power_kw': peak_power,
        'specific_yield_kwh_kwp': specific_yield,
        'performance_ratio_pct': pr_eval.get('pr_pct'),
        'plant_availability_pct': 99.4
    }

    # Savings
    savings_summary = SavingsService.calculate_savings(
        total_energy_kwh, plant.electricity_tariff, plant.export_tariff, plant.self_consumption_pct
    )

    # Alerts summary
    active_alerts = Alert.query.filter(Alert.plant_id == plant.id, Alert.status == 'ACTIVE').count()
    critical_alerts = Alert.query.filter(Alert.plant_id == plant.id, Alert.severity == 'CRITICAL').count()
    resolved_alerts = Alert.query.filter(Alert.plant_id == plant.id, Alert.status == 'RESOLVED').count()
    alert_summary = {
        'active_count': active_alerts,
        'critical_count': critical_alerts,
        'resolved_count': resolved_alerts
    }

    # Maintenance summary
    maint_tasks = MaintenanceTask.query.filter(MaintenanceTask.plant_id == plant.id).all()
    completed_m = sum(1 for m in maint_tasks if m.status == 'COMPLETED')
    pending_m = sum(1 for m in maint_tasks if m.status in ['SCHEDULED', 'IN_PROGRESS'])
    latest_task = maint_tasks[0].title if maint_tasks else 'Routine Array Inspection'
    maintenance_summary = {
        'completed_count': completed_m,
        'pending_count': pending_m,
        'latest_task_title': latest_task
    }

    report_context = {
        'plant': plant,
        'report_type': report_type,
        'start_date': start_dt.strftime('%Y-%m-%d'),
        'end_date': end_dt.strftime('%Y-%m-%d'),
        'summary_metrics': summary_metrics,
        'alert_summary': alert_summary,
        'maintenance_summary': maintenance_summary,
        'savings_summary': savings_summary,
        'readings_count': len(readings)
    }

    return plant, report_context

@reports_bp.route('/preview', methods=['POST'])
@jwt_required()
def preview_report():
    data = request.get_json() or {}
    plant_id = data.get('plant_id')
    report_type = data.get('report_type', 'monthly')
    start_date = data.get('start_date')
    end_date = data.get('end_date')

    plant, ctx = _gather_report_data(plant_id, report_type, start_date, end_date)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    return jsonify({
        'plant': plant.to_dict(),
        'report_type': ctx['report_type'],
        'start_date': ctx['start_date'],
        'end_date': ctx['end_date'],
        'summary_metrics': ctx['summary_metrics'],
        'alert_summary': ctx['alert_summary'],
        'maintenance_summary': ctx['maintenance_summary'],
        'savings_summary': ctx['savings_summary'],
        'readings_count': ctx['readings_count']
    }), 200

@reports_bp.route('/download/pdf', methods=['GET'])
@jwt_required()
def download_pdf():
    plant_id = request.args.get('plant_id')
    report_type = request.args.get('report_type', 'monthly')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    plant, ctx = _gather_report_data(plant_id, report_type, start_date, end_date)
    if not plant:
        return jsonify({'error': 'Solar plant not found'}), 404

    pdf_bytes = ReportService.generate_pdf_report(
        plant=plant,
        report_type=ctx['report_type'],
        start_date=ctx['start_date'],
        end_date=ctx['end_date'],
        summary_metrics=ctx['summary_metrics'],
        alert_summary=ctx['alert_summary'],
        maintenance_summary=ctx['maintenance_summary'],
        savings_summary=ctx['savings_summary']
    )

    filename = f"{plant.id}_{ctx['report_type']}_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return Response(
        pdf_bytes,
        mimetype='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )
