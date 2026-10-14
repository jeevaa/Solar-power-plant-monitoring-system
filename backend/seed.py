import sys
from app import create_app
from app.utils.seeder import seed_database

def main():
    force_reseed = '--reseed' in sys.argv
    app = create_app()
    with app.app_context():
        print(f"[*] Running database seeder (force_reseed={force_reseed})...")
        res = seed_database(force_reseed=force_reseed)
        print(f"[✓] {res.get('message', 'Completed')}")
        print("\nDefault Accounts Provisioned:")
        print("  Administrator : admin@solarplant.io    / Admin@123")
        print("  Operator      : operator@solarplant.io / Operator@123")
        print("  Viewer        : viewer@solarplant.io   / Viewer@123\n")

if __name__ == '__main__':
    main()
