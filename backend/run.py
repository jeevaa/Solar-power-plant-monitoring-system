import os
from app import create_app
from app.models.user import User
from app.utils.seeder import seed_database

app = create_app()

with app.app_context():
    # If users table is empty, auto-seed demo dataset so it works immediately
    if User.query.count() == 0:
        print("[*] Empty database detected. Auto-seeding initial plant, users, and telemetry...")
        seed_database()
        print("[✓] Initial database population complete.")

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    print(f"\n=======================================================")
    print(f" Solar Power Plant Monitoring & Performance Analysis System")
    print(f" Backend API running on http://127.0.0.1:{port}")
    print(f" Health check: http://127.0.0.1:{port}/api/health")
    print(f"=======================================================\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
