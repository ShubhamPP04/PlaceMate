"""Placement Cell Management System — Flask API + app factory."""
import os
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from .extensions import db
from .models import User


def _load_dotenv():
    """Load KEY=VALUE pairs from a local .env if present (no python-dotenv needed)."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip("'").strip('"')
        # Treat missing or empty env values as unset so .env can fill them.
        if key and (key not in os.environ or not os.environ.get(key)):
            os.environ[key] = value


def create_app():
    _load_dotenv()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or "dev-secret-change-me"
    # Prefer DATABASE_URL (Railway/Neon/Vercel). Convert postgres:// → postgresql://
    # for SQLAlchemy when hosts inject the short Heroku-style scheme.
    database_url = os.environ.get("DATABASE_URL") or (
        "postgresql+psycopg://jasneet@localhost:5432/placement_db"
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

    # Cross-origin session cookies (Vercel UI ↔ Vercel API on different subdomains).
    frontend_origin = (os.environ.get("FRONTEND_ORIGIN") or "").rstrip("/")
    is_prod = bool(os.environ.get("VERCEL") or os.environ.get("FRONTEND_ORIGIN"))
    app.config.update(
        SESSION_COOKIE_SAMESITE="None" if is_prod else "Lax",
        SESSION_COOKIE_SECURE=True if is_prod else False,
        SESSION_COOKIE_HTTPONLY=True,
    )

    db.init_app(app)
    cors_origins = [frontend_origin] if frontend_origin else True
    CORS(app, supports_credentials=True, origins=cors_origins)

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
