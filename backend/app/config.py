import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-solar-secret-key-2026')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-jwt-secret-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 24)))
    
    # Database URL
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        # Check MySQL specific variables
        mysql_user = os.getenv('MYSQL_USER')
        mysql_password = os.getenv('MYSQL_PASSWORD')
        mysql_host = os.getenv('MYSQL_HOST', 'localhost')
        mysql_port = os.getenv('MYSQL_PORT', '3306')
        mysql_db = os.getenv('MYSQL_DB', 'solar_monitoring')
        if mysql_user and mysql_password:
            DATABASE_URL = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}"
        else:
            base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
            DATABASE_URL = f"sqlite:///{os.path.join(base_dir, 'solar_monitoring.db')}"

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Engine options for stability
    if DATABASE_URL.startswith('mysql'):
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_recycle': 280,
            'pool_pre_ping': True,
        }
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {
            'connect_args': {'check_same_thread': False}
        }

    # External APIs
    OPEN_METEO_BASE_URL = os.getenv('OPEN_METEO_BASE_URL', 'https://api.open-meteo.com/v1/forecast')
    WEATHER_CACHE_MINUTES = 30

    # System parameters
    DEFAULT_CURRENCY = os.getenv('DEFAULT_CURRENCY', '₹')
    DEFAULT_CURRENCY_CODE = os.getenv('DEFAULT_CURRENCY_CODE', 'INR')
    DEMO_MODE_ENABLED = os.getenv('DEMO_MODE_ENABLED', 'true').lower() in ('true', '1', 'yes')
    
    # Reports output directory
    REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'reports_generated')
    os.makedirs(REPORTS_DIR, exist_ok=True)
