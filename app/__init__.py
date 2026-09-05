"""Placement Cell Management System — Flask API + app factory."""
import os
from pathlib import Path
from urllib.parse import urlsplit

from flask import Flask, current_app, jsonify, request
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
    # Cross-origin session cookies (Vercel UI ↔ Vercel API on different subdomains).
    frontend_origin = (os.environ.get("FRONTEND_ORIGIN") or "").rstrip("/")
    is_prod = bool(os.environ.get("VERCEL") or os.environ.get("FRONTEND_ORIGIN"))
    secret_key = os.environ.get("SECRET_KEY")
    if not secret_key:
        if is_prod:
            raise RuntimeError(
                "SECRET_KEY is required in production — sessions signed with the "
                "dev fallback are forgeable by anyone who has read this source."
            )
        secret_key = "dev-secret-change-me"  # local dev only
    app.config["SECRET_KEY"] = secret_key
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

    app.config.update(
        SESSION_COOKIE_SAMESITE="None" if is_prod else "Lax",
        SESSION_COOKIE_SECURE=True if is_prod else False,
        SESSION_COOKIE_HTTPONLY=True,
    )

    db.init_app(app)
    # flask-cors rejects a bool here; "*" makes it echo the request origin,
    # which is what credentialed requests need in local dev.
    CORS(app, supports_credentials=True, origins=[frontend_origin] if frontend_origin else "*")

    # The session cookie is SameSite=None in production (cross-subdomain UI/API),
    # so the browser attaches it to cross-site POSTs too. CORS cannot stop simple
    # form posts — verify Origin/Referer on state-changing requests instead.
    @app.before_request
    def _verify_origin():
        if request.method not in ("POST", "PUT", "PATCH", "DELETE") or not is_prod:
            return None
        source = request.headers.get("Origin") or request.headers.get("Referer") or ""
        if not source:
            return None  # non-browser client (curl, server-to-server)
        if "://" not in source:
            source = "https://" + source
        try:
            origin_host = urlsplit(source).netloc.lower()
        except ValueError:
            return jsonify(error="Cross-site request blocked"), 403
        allowed_hosts = {(request.host or "").lower()}
        if frontend_origin:
            fo = frontend_origin if "://" in frontend_origin else "https://" + frontend_origin
            allowed_hosts.add(urlsplit(fo).netloc.lower())
        if origin_host not in allowed_hosts:
            return jsonify(error="Cross-site request blocked"), 403
        return None

    from .routes.auth import auth_bp
    from .routes.admin import admin_bp
    from .routes.student import portal_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(portal_bp, url_prefix="/api/portal")

    with app.app_context():
        db.create_all()
        _seed_admin(is_prod)

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found"), 404

    return app


def _seed_admin(is_prod=False):
    """Create the initial admin account; password comes from ADMIN_PASSWORD."""
    if not User.query.filter_by(role="admin").first():
        password = os.environ.get("ADMIN_PASSWORD")
        if not password:
            password = "admin123"
            if is_prod:
                current_app.logger.warning(
                    "No ADMIN_PASSWORD set — seeded admin@placemate.edu with the "
                    "default password 'admin123'. Change it or set ADMIN_PASSWORD "
                    "before exposing this deployment."
                )
        db.session.add(
            User(
                email="admin@placemate.edu",
                password_hash=generate_password_hash(password),
                name="Placement Cell Admin",
                role="admin",
            )
        )
        db.session.commit()
