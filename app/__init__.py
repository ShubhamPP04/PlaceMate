"""Placement Cell Management System — Flask API + app factory."""
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from .extensions import db
from .models import User


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    # Prefer DATABASE_URL (Railway/Neon/Vercel). Convert postgres:// → postgresql://
    # for SQLAlchemy when hosts inject the short Heroku-style scheme.
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres@localhost:5432/placement_db",
    )
    # Normalize common provider schemes for SQLAlchemy + psycopg3.
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url[len("postgres://") :]
    if database_url.startswith("postgresql+psycopg2://"):
        database_url = "postgresql+psycopg://" + database_url[len("postgresql+psycopg2://") :]
    elif database_url.startswith("postgresql://"):
        database_url = "postgresql+psycopg://" + database_url[len("postgresql://") :]
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    CORS(app, supports_credentials=True)

    from .routes.auth import auth_bp
    from .routes.admin import admin_bp
    from .routes.student import portal_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(portal_bp, url_prefix="/api/portal")

    with app.app_context():
        db.create_all()
        _seed_admin()

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found"), 404

    return app


def _seed_admin():
    """Create a default admin account on first run."""
    if not User.query.filter_by(role="admin").first():
        db.session.add(
            User(
                email="admin@placemate.edu",
                password_hash=generate_password_hash("admin123"),
                name="Placement Cell Admin",
                role="admin",
            )
        )
        db.session.commit()
