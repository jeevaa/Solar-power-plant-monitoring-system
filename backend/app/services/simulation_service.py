import math
import hashlib
from datetime import datetime, date, time
from app.services.calculations import calculate_cell_temperature, calculate_expected_power

def get_deterministic_factor(seed_str):
    """Generates a deterministic float between 0.0 and 1.0 based on a seed string"""
    h = hashlib.md5(seed_str.encode()).hexdigest()
    val = int(h[:8], 16)
    return (val % 1000) / 1000.0

def simulate_telemetry_reading(plant, target_time=None, fault_mode=None):
    """
    Generates realistic, deterministic physical solar readings based on the given time,
    plant location, and installed capacity.
    
    :param plant: SolarPlant instance
    :param target_time: datetime instance (defaults to datetime.utcnow())
    :param fault_mode: optional forced fault condition for testing rules
    :return: dict with full electrical & environmental readings
    """
    if target_time is None:
        target_time = datetime.utcnow()

    # Time of day in decimal hours
    hour_decimal = target_time.hour + target_time.minute / 60.0 + target_time.second / 3600.0
    day_str = target_time.strftime('%Y-%m-%d')
    hour_seed = f"{plant.id}-{day_str}-{target_time.hour}"

    # Sunrise and Sunset bounds (typically 06:00 to 18:30)
    sunrise = 6.0
    sunset = 18.5
    solar_noon = (sunrise + sunset) / 2.0
    daylight_hours = sunset - sunrise

    is_daylight = (sunrise <= hour_decimal <= sunset)

    if not is_daylight:
        # Nighttime standby / sleep state
        ambient_temp = 20.0 + 3.0 * math.cos((hour_decimal / 24.0) * 2 * math.pi)
        return {
            'plant_id': plant.id,
            'timestamp': target_time,
            'is_simulated': True,
            'solar_irradiance_w_m2': 0.0,
            'ambient_temperature_c': round(ambient_temp, 1),
            'panel_temperature_c': round(ambient_temp - 1.0, 1),
            'dc_voltage': 0.0,
            'dc_current': 0.0,
            'dc_power_kw': 0.0,
            'ac_voltage': 0.0,
            'ac_current': 0.0,
            'ac_power_kw': 0.0,
            'grid_frequency_hz': 50.0,
            'inverter_efficiency_pct': 0.0,
            'expected_power_kw': 0.0
        }

    # Daylight: Solar Irradiance Curve (Half-sine with peak at solar noon ~950 W/m²)
    # Irradiance normalized 0 to 1
    t_norm = (hour_decimal - sunrise) / daylight_hours
    ideal_sine = math.sin(t_norm * math.pi)
    
    # Peak clear-sky irradiance
    peak_clear_sky = 980.0
    
    # Deterministic cloud attenuation (cloud factor between 0.70 and 1.0)
    # Some hours have minor passing clouds
    cloud_noise = get_deterministic_factor(hour_seed)
    cloud_factor = 0.82 + (0.18 * cloud_noise)
    if cloud_noise < 0.2:  # Occasional heavier cloud
        cloud_factor = 0.55 + (0.25 * cloud_noise)

    irradiance = round(peak_clear_sky * ideal_sine * cloud_factor, 1)
    irradiance = max(0.0, irradiance)

    # Ambient Temperature curve: peaks around 14:00 (approx 28°C to 38°C)
    temp_phase = (hour_decimal - 14.0) / 24.0 * 2 * math.pi
    ambient_temp = 28.0 + 7.0 * math.cos(temp_phase)
    
    # Cell / Module Temperature
    panel_temp = calculate_cell_temperature(ambient_temp, irradiance)

    # Inverter & DC Characteristics
    # DC Voltage operates in MPPT window (~620V - 680V) during generation
    nominal_mppt_v = 650.0
    # Temperature effect on voltage: approx -0.3% per °C rise above 25°C
    voltage_derate = 1.0 - 0.003 * (panel_temp - 25.0)
    dc_voltage = nominal_mppt_v * voltage_derate

    # Expected generation reference
    expected_kw = calculate_expected_power(plant.installed_capacity_kwp, irradiance, ambient_temp)

    # Actual Power generation
    capacity_ratio = plant.installed_capacity_kwp / 1000.0  # Normalized to 1MW
    actual_dc_kw = expected_kw * 0.985  # Normal operational derating

    # Handle injected fault mode if testing
    if fault_mode == 'LOW_POWER':
        actual_dc_kw *= 0.40  # 60% deficit
    elif fault_mode == 'HIGH_TEMP':
        panel_temp = 72.5
    elif fault_mode == 'VOLTAGE_FAULT':
        dc_voltage = 380.0

    # DC Current = Power (W) / Voltage (V)
    dc_current = (actual_dc_kw * 1000.0) / dc_voltage if dc_voltage > 0 else 0.0

    # Inverter conversion
    inverter_eff = 98.4 if actual_dc_kw > 10.0 else (90.0 if actual_dc_kw > 0 else 0.0)
    ac_power_kw = actual_dc_kw * (inverter_eff / 100.0)

    # AC 3-Phase Grid Voltage (nominal 415V line-to-line)
    ac_voltage = 415.0 + 2.0 * math.sin(hour_decimal * 2)
    # AC Current: I_ac = P_ac / (sqrt(3) * V_ll * pf) where pf ≈ 0.99
    ac_current = (ac_power_kw * 1000.0) / (math.sqrt(3) * ac_voltage * 0.99) if ac_voltage > 0 else 0.0

    # Grid frequency: 50Hz nominal with microscopic variance
    freq_jitter = (get_deterministic_factor(f"freq-{hour_seed}") - 0.5) * 0.06
    grid_freq = 50.0 + freq_jitter

    return {
        'plant_id': plant.id,
        'timestamp': target_time,
        'is_simulated': True,
        'solar_irradiance_w_m2': irradiance,
        'ambient_temperature_c': round(ambient_temp, 1),
        'panel_temperature_c': round(panel_temp, 1),
        'dc_voltage': round(dc_voltage, 1),
        'dc_current': round(dc_current, 1),
        'dc_power_kw': round(actual_dc_kw, 2),
        'ac_voltage': round(ac_voltage, 1),
        'ac_current': round(ac_current, 1),
        'ac_power_kw': round(ac_power_kw, 2),
        'grid_frequency_hz': round(grid_freq, 2),
        'inverter_efficiency_pct': round(inverter_eff, 2),
        'expected_power_kw': round(expected_kw, 2)
    }
