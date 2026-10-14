from datetime import datetime, date, timedelta
from app.models import db
from app.models.user import User
from app.models.plant import SolarPlant, Inverter
from app.models.reading import GenerationReading
from app.models.alert import Alert
from app.models.maintenance import MaintenanceTask
from app.models.settings import SystemSetting
from app.services.simulation_service import simulate_telemetry_reading

def seed_database(force_reseed=False):
    """
    Seeds the database with essential administrative accounts,
    two realistic solar power plants, equipment models, 30 days of persistent telemetry,
    historical alerts, maintenance work orders, and system configurations.
    """
    # Check if already seeded
    admin_exists = User.query.filter_by(email='admin@solarplant.io').first()
    if admin_exists and not force_reseed:
        return {'status': 'ALREADY_SEEDED', 'message': 'Database already contains seeded records.'}

    if force_reseed:
        db.drop_all()
        db.create_all()

    # 1. Seed Users (Admin, Operator, Viewer)
    users_data = [
        ('Administrator', 'admin@solarplant.io', 'Admin@123', 'ADMIN'),
        ('Solar Plant Operator', 'operator@solarplant.io', 'Operator@123', 'OPERATOR'),
        ('Energy Analyst Viewer', 'viewer@solarplant.io', 'Viewer@123', 'VIEWER'),
    ]
    for name, email, password, role in users_data:
        existing = User.query.filter_by(email=email).first()
        if not existing:
            u = User(name=name, email=email, role=role, is_active=True)
            u.set_password(password)
            db.session.add(u)

    # 2. Seed Solar Plants
    plant1 = SolarPlant.query.get('PLANT-001')
    if not plant1:
        plant1 = SolarPlant(
            id='PLANT-001',
            name='Helios Alpha Solar Park',
            description='1.0 MWp Utility-scale photovoltaic plant with central inverters and single-axis tracking.',
            location='Kurnool Ultra Mega Solar Park, Andhra Pradesh, India',
            latitude=15.6815,
            longitude=78.2778,
            installed_capacity_kwp=1000.0,
            panel_count=2500,
            rated_panel_power_wp=400.0,
            inverter_capacity_kw=950.0,
            panel_area_m2=5125.0,
            installation_date=date(2023, 3, 15),
            electricity_tariff=7.50,
            export_tariff=3.50,
            self_consumption_pct=75.0,
            expected_pr=80.0,
            low_gen_threshold_pct=65.0,
            status='ONLINE',
            is_demo_mode=True
        )
        db.session.add(plant1)

    plant2 = SolarPlant.query.get('PLANT-002')
    if not plant2:
        plant2 = SolarPlant(
            id='PLANT-002',
            name='Apollo Green Array II',
            description='500 kWp Commercial rooftop array with string inverters and tilt-fixed racking.',
            location='Bhadla Industrial Sector, Rajasthan, India',
            latitude=27.5385,
            longitude=71.9172,
            installed_capacity_kwp=500.0,
            panel_count=1250,
            rated_panel_power_wp=400.0,
            inverter_capacity_kw=480.0,
            panel_area_m2=2560.0,
            installation_date=date(2023, 8, 20),
            electricity_tariff=8.20,
            export_tariff=3.80,
            self_consumption_pct=65.0,
            expected_pr=78.0,
            low_gen_threshold_pct=60.0,
            status='ONLINE',
            is_demo_mode=True
        )
        db.session.add(plant2)

    db.session.commit()

    # 3. Seed Inverters
    inv1 = Inverter.query.get('INV-01')
    if not inv1:
        inv1 = Inverter(
            id='INV-01',
            plant_id='PLANT-001',
            name='SMA Sunny Central 500CP-XT (Block A)',
            model='SC-500CP-XT',
            rated_ac_power_kw=500.0,
            max_dc_voltage=1000.0,
            mppt_voltage_min=450.0,
            mppt_voltage_max=850.0,
            status='ONLINE',
            last_heartbeat=datetime.utcnow()
        )
        inv2 = Inverter(
            id='INV-02',
            plant_id='PLANT-001',
            name='SMA Sunny Central 500CP-XT (Block B)',
            model='SC-500CP-XT',
            rated_ac_power_kw=500.0,
            max_dc_voltage=1000.0,
            mppt_voltage_min=450.0,
            mppt_voltage_max=850.0,
            status='ONLINE',
            last_heartbeat=datetime.utcnow()
        )
        inv3 = Inverter(
            id='INV-03',
            plant_id='PLANT-002',
            name='Huawei SUN2000-100KTL String Inverter',
            model='SUN2000-100KTL-M1',
            rated_ac_power_kw=500.0,
            max_dc_voltage=1100.0,
            mppt_voltage_min=200.0,
            mppt_voltage_max=1000.0,
            status='ONLINE',
            last_heartbeat=datetime.utcnow()
        )
        db.session.add_all([inv1, inv2, inv3])
        db.session.commit()

    # 4. Seed Telemetry Readings (Past 30 days of hourly data)
    now = datetime.utcnow()
    existing_count = GenerationReading.query.filter_by(plant_id='PLANT-001').count()
    if existing_count < 100:
        readings_to_add = []
        for day_offset in range(30, -1, -1):
            curr_date = (now - timedelta(days=day_offset)).date()
            daily_accumulated_kwh = 0.0

            # Determine end hour for today
            end_hour = now.hour if day_offset == 0 else 23

            for hour in range(end_hour + 1):
                reading_time = datetime.combine(curr_date, datetime.min.time()) + timedelta(hours=hour)
                
                # Simulate telemetry
                data = simulate_telemetry_reading(plant1, reading_time)
                
                # Approximate hourly energy = AC kW * 1.0 hour
                interval_kwh = data['ac_power_kw'] * 1.0
                daily_accumulated_kwh += interval_kwh

                reading = GenerationReading(
                    plant_id='PLANT-001',
                    inverter_id='INV-01',
                    timestamp=reading_time,
                    is_simulated=True,
                    solar_irradiance_w_m2=data['solar_irradiance_w_m2'],
                    ambient_temperature_c=data['ambient_temperature_c'],
                    panel_temperature_c=data['panel_temperature_c'],
                    dc_voltage=data['dc_voltage'],
                    dc_current=data['dc_current'],
                    dc_power_kw=data['dc_power_kw'],
                    ac_voltage=data['ac_voltage'],
                    ac_current=data['ac_current'],
                    ac_power_kw=data['ac_power_kw'],
                    grid_frequency_hz=data['grid_frequency_hz'],
                    inverter_efficiency_pct=data['inverter_efficiency_pct'],
                    daily_energy_kwh=round(daily_accumulated_kwh, 2),
                    expected_power_kw=data['expected_power_kw']
                )
                readings_to_add.append(reading)

        # Batch insert
        db.session.bulk_save_objects(readings_to_add)
        db.session.commit()

    # 5. Seed Realistic Alerts
    if Alert.query.count() == 0:
        a1 = Alert(
            plant_id='PLANT-001',
            device_id='INV-02',
            alert_type='ABNORMAL_PANEL_TEMP',
            severity='WARNING',
            title='High Photovoltaic Module Temperature',
            description='Array Section 4B thermistor detected module cell temperature at 66.8°C.',
            detection_timestamp=now - timedelta(days=2, hours=3),
            measured_value='66.8 °C',
            expected_value='< 60.0 °C',
            status='RESOLVED',
            acknowledged_by='operator@solarplant.io',
            acknowledged_at=now - timedelta(days=2, hours=2),
            resolved_by='admin@solarplant.io',
            resolved_at=now - timedelta(days=2, hours=1),
            resolution_notes='Panel surface inspected; wind circulation normalized after clearing windbreak debris.'
        )
        a2 = Alert(
            plant_id='PLANT-001',
            device_id='CENTRAL-ARRAY',
            alert_type='LOW_POWER_OUTPUT',
            severity='WARNING',
            title='Abnormally Low Solar Power Output',
            description='Actual generation dropped 28% below clear-sky model reference during high irradiance.',
            detection_timestamp=now - timedelta(hours=4),
            measured_value='580.0 kW',
            expected_value='810.0 kW',
            status='ACKNOWLEDGED',
            acknowledged_by='operator@solarplant.io',
            acknowledged_at=now - timedelta(hours=3),
            resolution_notes='Dust layer accumulation detected post-sandstorm; panel cleaning work order scheduled.'
        )
        a3 = Alert(
            plant_id='PLANT-001',
            device_id='GRID-INTERFACE',
            alert_type='AC_OUTPUT_ANOMALY',
            severity='INFO',
            title='Grid Voltage Transient Fluctuation',
            description='Momentary grid line voltage swell to 438V cleared within 120ms.',
            detection_timestamp=now - timedelta(days=5),
            measured_value='438.0 V',
            expected_value='415.0 V',
            status='RESOLVED',
            acknowledged_by='operator@solarplant.io',
            acknowledged_at=now - timedelta(days=5),
            resolved_by='operator@solarplant.io',
            resolved_at=now - timedelta(days=5),
            resolution_notes='Local sub-station transformer tap changer adjustment confirmed.'
        )
        db.session.add_all([a1, a2, a3])
        db.session.commit()

    # 6. Seed Maintenance Tasks
    if MaintenanceTask.query.count() == 0:
        m1 = MaintenanceTask(
            plant_id='PLANT-001',
            title='Routine Photovoltaic Array Waterless Robot Cleaning',
            equipment='PV Module Arrays (Strings 1-20)',
            description='Automated dry brush cleaning of 2,500 modules to clear soiling and restore PR > 80%.',
            priority='HIGH',
            status='IN_PROGRESS',
            technician_name='Karthik Verma',
            technician_email='karthik.v@solartech.com',
            scheduled_date=date.today() - timedelta(days=1),
            due_date=date.today() + timedelta(days=2),
            notes='Zone A complete; Zone B automated sweep ongoing.'
        )
        m2 = MaintenanceTask(
            plant_id='PLANT-001',
            title='Inverter SC-500CP-XT Air Filter & Cooling Fan Replacement',
            equipment='Inverter INV-01',
            description='Inspect intake plenum filters, measure fan bearing RPM, clean heat sinks.',
            priority='MEDIUM',
            status='COMPLETED',
            technician_name='Priya Sharma',
            technician_email='priya.s@solartech.com',
            scheduled_date=date.today() - timedelta(days=10),
            due_date=date.today() - timedelta(days=8),
            completed_at=datetime.utcnow() - timedelta(days=8),
            notes='Both cooling fans replaced with OEM spares. Internal thermal delta decreased by 4.5°C.'
        )
        m3 = MaintenanceTask(
            plant_id='PLANT-001',
            title='Class-A Pyranometer Sensor Calibration',
            equipment='Secondary Weather Station Pyranometer',
            description='Calibrate secondary Kipp & Zonen CMP11 pyranometer against calibrated reference.',
            priority='LOW',
            status='SCHEDULED',
            technician_name='Vikram Rao',
            technician_email='vikram.r@solartech.com',
            scheduled_date=date.today() + timedelta(days=5),
            due_date=date.today() + timedelta(days=12),
            notes='Annual radiometric recalibration certificate verification.'
        )
        db.session.add_all([m1, m2, m3])
        db.session.commit()

    # 7. Seed System Settings
    settings_data = [
        ('low_power_threshold_pct', '65.0', 'Percentage below expected power triggering low-generation fault', 'THRESHOLDS'),
        ('max_panel_temp_c', '65.0', 'Maximum permissible PV module temperature in degrees Celsius', 'THRESHOLDS'),
        ('voltage_mppt_min_v', '450.0', 'Minimum acceptable MPPT operating voltage', 'THRESHOLDS'),
        ('voltage_mppt_max_v', '850.0', 'Maximum acceptable MPPT operating voltage', 'THRESHOLDS'),
        ('heartbeat_timeout_seconds', '300', 'Seconds before inverter is classified as offline', 'GENERAL'),
        ('default_currency_symbol', '₹', 'Display currency symbol for economic savings', 'GENERAL'),
        ('weather_cache_minutes', '30', 'Open-Meteo cache retention window', 'WEATHER'),
    ]
    for key, val, desc, cat in settings_data:
        s = SystemSetting.query.get(key)
        if not s:
            s = SystemSetting(key=key, value=val, description=desc, category=cat)
            db.session.add(s)
    db.session.commit()

    return {'status': 'SUCCESS', 'message': 'Database seeded successfully with initial data.'}
