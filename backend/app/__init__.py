import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.models import db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    
    # Configure CORS for Vite development frontend (localhost:5173, etc.)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    jwt = JWTManager(app)

    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({'error': 'Missing or invalid authentication token. Please sign in.'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({'error': 'Invalid authorization signature.'}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Your authentication session has expired. Please sign in again.'}), 401

    # Register API Blueprints
    from app.routes.auth import auth_bp
    from app.routes.plants import plants_bp
    from app.routes.live import live_bp
    from app.routes.analytics import analytics_bp
    from app.routes.weather import weather_bp
    from app.routes.performance import performance_bp
    from app.routes.faults import faults_bp
    from app.routes.alerts import alerts_bp
    from app.routes.savings import savings_bp
    from app.routes.reports import reports_bp
    from app.routes.maintenance import maintenance_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(plants_bp)
    app.register_blueprint(live_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(weather_bp)
    app.register_blueprint(performance_bp)
    app.register_blueprint(faults_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(savings_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(settings_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'ONLINE',
            'system': 'Solar Power Plant Monitoring & Performance Analysis System',
            'version': '1.0.0',
            'database': app.config['SQLALCHEMY_DATABASE_URI'].split('://')[0]
        }), 200

    # Auto create tables on startup
    with app.app_context():
        db.create_all()

    return app
