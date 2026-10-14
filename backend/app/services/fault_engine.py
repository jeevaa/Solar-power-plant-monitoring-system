from datetime import datetime, timedelta
from app.models import db
from app.models.alert import Alert

class FaultEngine:
    COOLDOWN_MINUTES = 60  # Prevent alert spamming for recurring threshold violations

    @staticmethod
    def _is_cooling_down(plant_id, alert_type, device_id=None):
        """Checks if an identical active alert exists or one was triggered recently"""
        cutoff = datetime.utcnow() - timedelta(minutes=FaultEngine.COOLDOWN_MINUTES)
        query = Alert.query.filter(
            Alert.plant_id == plant_id,
            Alert.alert_type == alert_type
        )
        if device_id:
            query = query.filter(Alert.device_id == device_id)
        
        # Check active alerts first
        active = query.filter(Alert.status.in_(['ACTIVE', 'ACKNOWLEDGED'])).first()
        if active:
            return True, active

        # Check recently resolved/triggered alerts within cooldown
        recent = query.filter(Alert.detection_timestamp >= cutoff).first()
        if recent:
            return True, recent

        return False, None

    @classmethod
    def evaluate_reading(cls, plant, reading, inverters=None):
        """
        Runs the 8 deterministic fault detection rules on the latest solar plant reading.
        Creates alerts in the database if thresholds are violated.
        """
        created_alerts = []
        now = reading.timestamp if isinstance(reading.timestamp, datetime) else datetime.utcnow()
        hour = now.hour
        is_daylight = (6 <= hour <= 18) and (reading.solar_irradiance_w_m2 > 100.0)

        # -------------------------------------------------------------
        # Rule 1: Low Power Output (Daylight only! Irradiance > 150 W/m²)
        # -------------------------------------------------------------
        if is_daylight and reading.expected_power_kw and reading.expected_power_kw > 20.0:
            threshold_ratio = (plant.low_gen_threshold_pct or 65.0) / 100.0
            min_acceptable_kw = reading.expected_power_kw * threshold_ratio
            if reading.ac_power_kw < min_acceptable_kw:
                cooling, _ = cls._is_cooling_down(plant.id, 'LOW_POWER_OUTPUT')
                if not cooling:
                    deficit_pct = round((1.0 - (reading.ac_power_kw / reading.expected_power_kw)) * 100.0, 1)
                    alert = Alert(
                        plant_id=plant.id,
                        device_id='CENTRAL-ARRAY',
                        alert_type='LOW_POWER_OUTPUT',
                        severity='WARNING' if deficit_pct < 50 else 'CRITICAL',
                        title='Abnormally Low Solar Power Output',
                        description=(f"Actual AC power ({reading.ac_power_kw:.1f} kW) is {deficit_pct}% below "
                                     f"the physical expected power ({reading.expected_power_kw:.1f} kW) during valid irradiance "
                                     f"({reading.solar_irradiance_w_m2:.0f} W/m²). Potential causes: shading, soiling, string fuse blown."),
                        measured_value=f"{reading.ac_power_kw:.1f} kW",
                        expected_value=f"{reading.expected_power_kw:.1f} kW",
                        status='ACTIVE',
                        detection_timestamp=now
                    )
                    db.session.add(alert)
                    created_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 2: Inverter Offline
        # -------------------------------------------------------------
        if inverters:
            for inv in inverters:
                if inv.status == 'OFFLINE' or (inv.last_heartbeat and (now - inv.last_heartbeat).total_seconds() > 300):
                    cooling, _ = cls._is_cooling_down(plant.id, 'INVERTER_OFFLINE', inv.id)
                    if not cooling:
                        alert = Alert(
                            plant_id=plant.id,
                            device_id=inv.id,
                            alert_type='INVERTER_OFFLINE',
                            severity='CRITICAL',
                            title=f"Inverter {inv.id} Heartbeat Timeout / Offline",
                            description=f"Inverter '{inv.name}' is unreachable or has missed its heartbeat interval (> 5 min).",
                            measured_value="OFFLINE / No Heartbeat",
                            expected_value="ONLINE (Heartbeat < 60s)",
                            status='ACTIVE',
                            detection_timestamp=now
                        )
                        db.session.add(alert)
                        created_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 3: Abnormal Panel Temperature
        # -------------------------------------------------------------
        if reading.panel_temperature_c > 65.0:  # Threshold: 65°C
            cooling, _ = cls._is_cooling_down(plant.id, 'ABNORMAL_PANEL_TEMP')
            if not cooling:
                severity = 'CRITICAL' if reading.panel_temperature_c > 75.0 else 'WARNING'
                alert = Alert(
                    plant_id=plant.id,
                    device_id='PV-MODULES',
                    alert_type='ABNORMAL_PANEL_TEMP',
                    severity=severity,
                    title='High Photovoltaic Module Temperature',
                    description=(f"Panel surface temperature reached {reading.panel_temperature_c:.1f}°C, exceeding the safe "
                                 f"operational threshold of 65.0°C. Accelerated thermal degradation and power derating occur."),
                    measured_value=f"{reading.panel_temperature_c:.1f} °C",
                    expected_value="< 60.0 °C",
                    status='ACTIVE',
                    detection_timestamp=now
                )
                db.session.add(alert)
                created_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 4: DC Voltage Out of Range (Daylight only)
        # -------------------------------------------------------------
        if is_daylight and reading.dc_voltage > 10.0:
            # Standard MPPT window 450V - 850V
            if reading.dc_voltage < 450.0 or reading.dc_voltage > 880.0:
                cooling, _ = cls._is_cooling_down(plant.id, 'DC_VOLTAGE_OUT_OF_RANGE')
                if not cooling:
                    alert = Alert(
                        plant_id=plant.id,
                        device_id='DC-BUS',
                        alert_type='DC_VOLTAGE_OUT_OF_RANGE',
                        severity='WARNING',
                        title='DC Bus Voltage Outside MPPT Operating Window',
                        description=(f"Measured DC voltage ({reading.dc_voltage:.1f} V) is outside the optimal MPPT "
                                     f"range (450V - 850V). Inverter MPPT tracking may have decoupled."),
                        measured_value=f"{reading.dc_voltage:.1f} V",
                        expected_value="450.0 - 850.0 V",
                        status='ACTIVE',
                        detection_timestamp=now
                    )
                    db.session.add(alert)
                    created_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 5: AC Output Anomaly (Voltage or Frequency)
        # -------------------------------------------------------------
        if reading.ac_power_kw > 5.0:
            is_v_anomaly = (reading.ac_voltage < 380.0 or reading.ac_voltage > 445.0)
            is_f_anomaly = (reading.grid_frequency_hz < 49.2 or reading.grid_frequency_hz > 50.8)
            if is_v_anomaly or is_f_anomaly:
                cooling, _ = cls._is_cooling_down(plant.id, 'AC_OUTPUT_ANOMALY')
                if not cooling:
                    desc = f"AC Grid synchronization deviation: Voltage={reading.ac_voltage:.1f}V (nom 415V), Freq={reading.grid_frequency_hz:.2f}Hz (nom 50Hz)."
                    alert = Alert(
                        plant_id=plant.id,
                        device_id='GRID-INTERFACE',
                        alert_type='AC_OUTPUT_ANOMALY',
                        severity='CRITICAL' if is_f_anomaly else 'WARNING',
                        title='AC Grid Parameter Anomaly Detected',
                        description=desc,
                        measured_value=f"{reading.ac_voltage:.1f} V / {reading.grid_frequency_hz:.2f} Hz",
                        expected_value="390-440 V / 49.5-50.5 Hz",
                        status='ACTIVE',
                        detection_timestamp=now
                    )
                    db.session.add(alert)
                    created_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 6: Low Daily Generation (Evaluated after 16:00 local time)
        # -------------------------------------------------------------
        if hour >= 16:
            # Expected daily generation estimate ~ 4.2 peak sun hours * capacity
            expected_daily_min = plant.installed_capacity_kwp * 2.8 # 2.8 kWh/kWp minimum acceptable
            if reading.daily_energy_kwh < expected_daily_min and reading.daily_energy_kwh > 0:
                cooling, _ = cls._is_cooling_down(plant.id, 'LOW_DAILY_GENERATION')
                if not cooling:
                    alert = Alert(
                        plant_id=plant.id,
                        device_id='PLANT-TOTAL',
                        alert_type='LOW_DAILY_GENERATION',
                        severity='WARNING',
                        title='Sub-target Accumulated Daily Generation',
                        description=(f"Accumulated daily energy at {now.strftime('%H:%M')} is {reading.daily_energy_kwh:.1f} kWh, "
                                     f"substantially below the seasonal benchmark expectation ({expected_daily_min:.1f} kWh)."),
                        measured_value=f"{reading.daily_energy_kwh:.1f} kWh",
                        expected_value=f">= {expected_daily_min:.1f} kWh",
                        status='ACTIVE',
                        detection_timestamp=now
                    )
                    db.session.add(alert)
                    created_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 7: Sensor Data Stale (Evaluated in Live Device mode)
        # -------------------------------------------------------------
        if not reading.is_simulated:
            age_seconds = (datetime.utcnow() - reading.timestamp).total_seconds()
            if age_seconds > 600:  # 10 minutes
                cooling, _ = cls._is_cooling_down(plant.id, 'SENSOR_DATA_STALE')
                if not cooling:
                    alert = Alert(
                        plant_id=plant.id,
                        device_id='GATEWAY',
                        alert_type='SENSOR_DATA_STALE',
                        severity='WARNING',
                        title='Telemetry Feed Latency / Stale Sensor Data',
                        description=f"No new telemetry received from gateway for {int(age_seconds / 60)} minutes.",
                        measured_value=f"{int(age_seconds / 60)} min lag",
                        expected_value="< 2 min lag",
                        status='ACTIVE',
                        detection_timestamp=now
                    )
                    db.session.add(alert)
                    created_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 8: Abnormal Performance Ratio (Daylight hours)
        # -------------------------------------------------------------
        if is_daylight and reading.solar_irradiance_w_m2 > 400.0 and reading.expected_power_kw > 50.0:
            instant_pr = (reading.ac_power_kw / reading.expected_power_kw) * 100.0
            if instant_pr < 55.0:
                cooling, _ = cls._is_cooling_down(plant.id, 'ABNORMAL_PERFORMANCE_RATIO')
                if not cooling:
                    alert = Alert(
                        plant_id=plant.id,
                        device_id='PERFORMANCE-INDEX',
                        alert_type='ABNORMAL_PERFORMANCE_RATIO',
                        severity='WARNING',
                        title='Depressed Operational Performance Ratio',
                        description=(f"Instantaneous performance ratio is {instant_pr:.1f}%, deviating below "
                                     f"the expected baseline of {plant.expected_pr or 80.0}%. Possible module dust layer or string mismatch."),
                        measured_value=f"{instant_pr:.1f} %",
                        expected_value=f">= {plant.expected_pr or 80.0:.1f} %",
                        status='ACTIVE',
                        detection_timestamp=now
                    )
                    db.session.add(alert)
                    created_alerts.append(alert)

        if created_alerts:
            db.session.commit()
            
        return created_alerts
