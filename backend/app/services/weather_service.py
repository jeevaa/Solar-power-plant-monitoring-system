import requests
from datetime import datetime, timedelta
from app.config import Config
from app.services.simulation_service import get_deterministic_factor

# In-memory weather cache: key -> { 'data': dict, 'expires_at': datetime }
_weather_cache = {}

class WeatherService:
    @staticmethod
    def get_weather(latitude, longitude, plant_id=None):
        """
        Retrieves real-time weather and solar radiation for the given coordinates.
        Uses Open-Meteo API when available, with caching and deterministic fallback.
        """
        cache_key = f"{round(latitude, 4)}_{round(longitude, 4)}"
        now = datetime.utcnow()

        # Check cache
        if cache_key in _weather_cache:
            entry = _weather_cache[cache_key]
            if entry['expires_at'] > now:
                return entry['data']

        # Attempt call to Open-Meteo API
        try:
            params = {
                'latitude': latitude,
                'longitude': longitude,
                'current': 'temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation',
                'hourly': 'temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation,direct_normal_irradiance,global_horizontal_irradiance',
                'daily': 'sunrise,sunset,uv_index_max',
                'timezone': 'auto',
                'forecast_days': 2
            }
            resp = requests.get(Config.OPEN_METEO_BASE_URL, params=params, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get('current', {})
                daily = data.get('daily', {})
                hourly = data.get('hourly', {})

                # Find coincident hourly index for radiation
                hourly_times = hourly.get('time', [])
                current_time_str = current.get('time', '')
                ghi = 0.0
                dni = 0.0
                if current_time_str and current_time_str in hourly_times:
                    idx = hourly_times.index(current_time_str)
                    ghi = hourly.get('global_horizontal_irradiance', [0])[idx] or 0.0
                    dni = hourly.get('direct_normal_irradiance', [0])[idx] or 0.0

                sunrise = daily.get('sunrise', ['06:15'])[0] if daily.get('sunrise') else '06:15'
                sunset = daily.get('sunset', ['18:30'])[0] if daily.get('sunset') else '18:30'

                # Build 24-hr forecast array
                forecast_hourly = []
                limit = min(24, len(hourly_times))
                for i in range(limit):
                    forecast_hourly.append({
                        'time': hourly_times[i],
                        'temperature_c': hourly.get('temperature_2m', [0])[i],
                        'humidity_pct': hourly.get('relative_humidity_2m', [0])[i],
                        'cloud_cover_pct': hourly.get('cloud_cover', [0])[i],
                        'wind_speed_ms': hourly.get('wind_speed_10m', [0])[i],
                        'precipitation_mm': hourly.get('precipitation', [0])[i],
                        'ghi_w_m2': hourly.get('global_horizontal_irradiance', [0])[i] or 0.0,
                        'dni_w_m2': hourly.get('direct_normal_irradiance', [0])[i] or 0.0
                    })

                result = {
                    'weather_source': 'OPEN_METEO_API',
                    'is_fallback': False,
                    'timestamp': current.get('time', now.isoformat()),
                    'temperature_c': current.get('temperature_2m', 28.0),
                    'relative_humidity_pct': current.get('relative_humidity_2m', 45.0),
                    'cloud_cover_pct': current.get('cloud_cover', 15.0),
                    'wind_speed_ms': current.get('wind_speed_10m', 3.2),
                    'precipitation_mm': current.get('precipitation', 0.0),
                    'global_horizontal_irradiance': float(ghi),
                    'direct_normal_irradiance': float(dni),
                    'sunrise': sunrise,
                    'sunset': sunset,
                    'forecast_hourly': forecast_hourly,
                    'note': 'Live meteorological observations fetched from Open-Meteo'
                }

                # Store in cache
                _weather_cache[cache_key] = {
                    'data': result,
                    'expires_at': now + timedelta(minutes=Config.WEATHER_CACHE_MINUTES)
                }
                return result

        except Exception as e:
            # Network issue or rate-limit -> graceful deterministic fallback
            pass

        # Deterministic offline/demo fallback
        hour = now.hour
        is_daylight = 6 <= hour <= 18
        seed = f"{round(latitude,2)}_{round(longitude,2)}_{now.strftime('%Y-%m-%d-%H')}"
        cloud_pct = round(15.0 + get_deterministic_factor(seed) * 25.0, 1)
        temp_c = round(26.0 + 8.0 * (1.0 - abs(hour - 14) / 10.0), 1)
        ghi_estimate = round(max(0.0, 920.0 * (1.0 - (cloud_pct / 100.0) * 0.4) * (1.0 - abs(hour - 12) / 6.5)), 1) if is_daylight else 0.0

        forecast_hourly = []
        for h in range(24):
            h_time = (now.replace(hour=h, minute=0, second=0)).isoformat()
            h_daylight = 6 <= h <= 18
            h_ghi = round(max(0.0, 900.0 * (1.0 - abs(h - 12) / 6.5)), 1) if h_daylight else 0.0
            forecast_hourly.append({
                'time': h_time,
                'temperature_c': round(24.0 + 9.0 * (1.0 - abs(h - 14) / 10.0), 1),
                'humidity_pct': 45.0,
                'cloud_cover_pct': cloud_pct,
                'wind_speed_ms': 3.5,
                'precipitation_mm': 0.0,
                'ghi_w_m2': h_ghi,
                'dni_w_m2': round(h_ghi * 0.85, 1)
            })

        fallback_result = {
            'weather_source': 'SIMULATED_CACHE',
            'is_fallback': True,
            'timestamp': now.isoformat(),
            'temperature_c': temp_c,
            'relative_humidity_pct': 48.0,
            'cloud_cover_pct': cloud_pct,
            'wind_speed_ms': 3.4,
            'precipitation_mm': 0.0,
            'global_horizontal_irradiance': ghi_estimate,
            'direct_normal_irradiance': round(ghi_estimate * 0.82, 1),
            'sunrise': '06:12',
            'sunset': '18:28',
            'forecast_hourly': forecast_hourly,
            'note': 'Synthesized astronomical clear-sky estimate (Open-Meteo API offline or rate-limited)'
        }
        return fallback_result
