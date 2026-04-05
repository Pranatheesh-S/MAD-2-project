import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory
from backend.config import Config
from backend.extensions import db, jwt, cors
from backend.models import User, StudentProfile, CompanyProfile, PlacementDrive, Application


def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config.from_object(Config)
    app.config.update(
        broker_url=Config.broker_url,
        result_backend=Config.result_backend
    )

    # Init extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})

    # Register blueprints
    from backend.routes.auth import auth_bp
    from backend.routes.admin import admin_bp
    from backend.routes.company import company_bp
    from backend.routes.student import student_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(student_bp)

    # Serve Vue SPA
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
        file_path = os.path.join(frontend_dir, path)
        if path and os.path.exists(file_path):
            return send_from_directory(frontend_dir, path)
        return send_from_directory(frontend_dir, 'index.html')

    # Create DB tables and seed admin on first run
    with app.app_context():
        db.create_all()
        _seed_admin()

    return app


def _seed_admin():
    if not User.query.filter_by(role='admin').first():
        admin = User(username='admin', email='admin@ppa.edu', role='admin', is_active=True)
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('[SEED] Admin user created — email: admin@ppa.edu | password: admin123')

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
