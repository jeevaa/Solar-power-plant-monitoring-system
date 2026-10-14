from datetime import datetime

def integrate_power_to_energy(data_points, max_gap_seconds=1800):
    """
    Numerically integrates instantaneous power (kW) over elapsed time to calculate energy (kWh).
    Uses the composite trapezoidal rule:
        ΔE = 0.5 * (P_i + P_{i+1}) * (Δt_seconds / 3600)
    
    Data gap handling:
    If the elapsed time between consecutive samples exceeds max_gap_seconds (default 30 min),
    the interval is treated as a telemetry outage and not interpolated, avoiding overestimation.
    
    :param data_points: list of dicts with 'timestamp' (datetime) and 'power_kw' (float) or tuples
    :param max_gap_seconds: maximum permitted gap in seconds before treating as an outage
    :return: total energy in kWh (float)
    """
    if not data_points or len(data_points) < 2:
        if len(data_points) == 1:
            return 0.0
        return 0.0

    # Ensure sorted by timestamp
    points = []
    for p in data_points:
        if isinstance(p, dict):
            ts = p['timestamp']
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            pwr = float(p.get('power_kw') or p.get('ac_power_kw') or 0.0)
            points.append((ts, max(0.0, pwr)))
        elif isinstance(p, (list, tuple)):
            points.append((p[0], max(0.0, float(p[1]))))

    points.sort(key=lambda x: x[0])

    total_energy_kwh = 0.0
    for i in range(len(points) - 1):
        t1, p1 = points[i]
        t2, p2 = points[i + 1]
        
        delta_seconds = (t2 - t1).total_seconds()
        if 0 < delta_seconds <= max_gap_seconds:
            # Trapezoidal integration segment
            avg_power = 0.5 * (p1 + p2)
            interval_energy = avg_power * (delta_seconds / 3600.0)
            total_energy_kwh += interval_energy

    return round(total_energy_kwh, 3)

def safe_divide(numerator, denominator, default=0.0):
    """Safely divides two numbers avoiding ZeroDivisionError and NaN"""
    try:
        num = float(numerator)
        den = float(denominator)
        if den == 0.0:
            return default
        val = num / den
        return default if (val != val) else round(val, 4) # handle NaN
    except (TypeError, ValueError, ZeroDivisionError):
        return default
