import math
from app.utils.math_helpers import safe_divide

# Standard PV engineering constants
GAMMA_TEMP_COEFF = -0.0038  # Power temperature coefficient for standard silicon PV: -0.38% / °C
STC_IRRADIANCE = 1000.0     # Standard Test Conditions: 1000 W/m²
STC_CELL_TEMP = 25.0        # STC Cell Temperature: 25 °C
NOCT = 45.0                 # Nominal Operating Cell Temperature: 45 °C

def calculate_cell_temperature(ambient_temp_c, irradiance_w_m2):
    """
    Estimates PV cell temperature using NOCT thermal model:
    T_cell = T_ambient + (NOCT - 20) / 800 * G
    """
    if irradiance_w_m2 <= 0:
        return ambient_temp_c
    return ambient_temp_c + ((NOCT - 20.0) / 800.0) * irradiance_w_m2

def calculate_expected_power(installed_capacity_kwp, irradiance_w_m2, ambient_temp_c, inverter_efficiency=0.98, system_loss_factor=0.88):
    """
    Computes theoretical expected power output (kW) based on physics of irradiance and thermal derating:
    P_expected = P_stc * (G / 1000) * [1 + gamma * (T_cell - 25)] * inverter_eff * derate_factor
    """
    if irradiance_w_m2 < 10.0 or installed_capacity_kwp <= 0:
        return 0.0
    
    cell_temp = calculate_cell_temperature(ambient_temp_c, irradiance_w_m2)
    thermal_derate = 1.0 + (GAMMA_TEMP_COEFF * (cell_temp - STC_CELL_TEMP))
    # Cap thermal derate to realistic range (0.75 - 1.05)
    thermal_derate = max(0.70, min(1.05, thermal_derate))
    
    irradiance_ratio = irradiance_w_m2 / STC_IRRADIANCE
    expected_kw = installed_capacity_kwp * irradiance_ratio * thermal_derate * inverter_efficiency * system_loss_factor
    return max(0.0, round(expected_kw, 2))

def calculate_specific_yield(energy_generated_kwh, installed_capacity_kwp):
    """
    Specific Yield (kWh/kWp) = Energy Generated (kWh) / Installed Capacity (kWp)
    Normalized metric allowing comparison between solar plants of different capacities.
    """
    if installed_capacity_kwp <= 0:
        return 0.0
    return round(energy_generated_kwh / installed_capacity_kwp, 3)

def calculate_performance_ratio(actual_ac_energy_kwh, installed_capacity_kwp, reference_irradiation_kwh_m2):
    """
    Performance Ratio (PR %) = Actual AC Energy / (Installed DC Capacity * Reference Solar Irradiation)
    Where:
      - Actual AC Energy is in kWh
      - Installed DC Capacity is in kWp
      - Reference Irradiation is in kWh/m² (equivalent to Peak Sun Hours)
    
    Returns a dict with pr_pct and status explanations.
    """
    if reference_irradiation_kwh_m2 is None or reference_irradiation_kwh_m2 <= 0.05:
        return {
            'pr_pct': None,
            'is_valid': False,
            'reason': "Reference solar irradiation is too low (nighttime/overcast) or unavailable to evaluate PR."
        }
    
    if installed_capacity_kwp <= 0:
        return {
            'pr_pct': None,
            'is_valid': False,
            'reason': "Installed DC capacity must be greater than zero."
        }

    # Reference Yield Y_r = H_i / G_stc = H_i (hours)
    # Expected Energy = Installed_kWp * Reference_Irradiation_kWh_m2
    expected_nominal_energy_kwh = installed_capacity_kwp * reference_irradiation_kwh_m2
    pr = (actual_ac_energy_kwh / expected_nominal_energy_kwh) * 100.0
    pr_rounded = round(min(100.0, max(0.0, pr)), 2)

    return {
        'pr_pct': pr_rounded,
        'is_valid': True,
        'actual_ac_energy_kwh': round(actual_ac_energy_kwh, 2),
        'expected_nominal_kwh': round(expected_nominal_energy_kwh, 2),
        'reference_irradiation_kwh_m2': round(reference_irradiation_kwh_m2, 3),
        'reason': "Valid PR computed using actual AC energy and integrated plane-of-array solar irradiation."
    }

def calculate_panel_efficiency(dc_power_watts, irradiance_w_m2, total_panel_area_m2):
    """
    Panel Efficiency (%) = DC Electrical Output Power / (Solar Irradiance * Total Panel Area) * 100
    
    Strict standard requirements:
    - Uses DC panel-side power in Watts
    - Irradiance in W/m²
    - Surface area in m²
    """
    if not total_panel_area_m2 or total_panel_area_m2 <= 0:
        return {
            'efficiency_pct': None,
            'is_valid': False,
            'reason': "Total panel aperture area is not configured. Rated module STC efficiency shown instead."
        }
    
    if irradiance_w_m2 < 50.0:
        return {
            'efficiency_pct': None,
            'is_valid': False,
            'reason': "Solar irradiance (<50 W/m²) too low for meaningful operational efficiency evaluation."
        }

    incident_solar_power_watts = irradiance_w_m2 * total_panel_area_m2
    if incident_solar_power_watts <= 0:
        return {'efficiency_pct': None, 'is_valid': False, 'reason': "Zero incident solar power."}

    efficiency = (dc_power_watts / incident_solar_power_watts) * 100.0
    # Physical silicon panels range between 12% and 24%
    return {
        'efficiency_pct': round(min(30.0, max(0.0, efficiency)), 2),
        'is_valid': True,
        'dc_power_watts': round(dc_power_watts, 1),
        'incident_watts': round(incident_solar_power_watts, 1),
        'reason': "Calculated from measured DC power and coincident pyranometer irradiance."
    }

def calculate_plant_availability(operational_minutes, expected_daylight_minutes):
    """
    Calculates Plant Operational Availability (%):
    Availability = (Operational daylight duration / Total daylight duration) * 100
    Excludes nighttime periods where the inverter enters sleep/standby mode naturally.
    """
    if expected_daylight_minutes <= 0:
        return 100.0
    availability = (operational_minutes / expected_daylight_minutes) * 100.0
    return round(min(100.0, max(0.0, availability)), 2)
