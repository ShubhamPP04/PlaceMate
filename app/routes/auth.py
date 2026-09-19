"""Auth API — session-based login/logout/me."""
import time
from collections import defaultdict, deque
from functools import wraps

from flask import Blueprint, g, jsonify, request, session
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash

from ..extensions import db
from ..models import RecoveryRequest, Student, User

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------- rate limit
# Simple in-memory fixed-window limiter. Good enough for a single-process
# deployment; swap for Redis/Flask-Limiter if you ever run multiple workers.
_ATTEMPTS = defaultdict(deque)


def _client_ip():
    # Trust the first X-Forwarded-For hop when behind a proxy (Vercel), else peer.
    fwd = request.headers.get("X-Forwarded-For", "")
    return (fwd.split(",")[0].strip() or request.remote_addr or "unknown")


def _rate_limit(key, max_attempts, window_seconds):
    """True if allowed; prunes old timestamps for this key."""
    now = time.monotonic()
    hits = _ATTEMPTS[key]
    while hits and now - hits[0] > window_seconds:
        hits.popleft()
    if len(hits) >= max_attempts:
        return False
    hits.append(now)
    return True


def _rate_limited_response():
    return jsonify(error="Too many attempts. Please try again later."), 429


# ------------------------------------------------------------------ helpers

def _load_user():
    """Fetch the session user fresh from the DB; None if gone/invalid.

    Keeps name/role in `g` and the session in sync so an admin edit (or a
    deleted/demoted account) takes effect on the very next request instead of
    after re-login.
    """
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = db.session.get(User, user_id)
    if user is None:
        session.clear()
        return None
    if session.get("role") != user.role or session.get("name") != user.name:
        session["role"] = user.role
        session["name"] = user.name
    return user


def login_required(role=None):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = _load_user()
            if not user:
                return jsonify(error="Authentication required"), 401
            if role and user.role != role:
                return jsonify(error="Forbidden"), 403
            g.user_id = user.id
            g.role = user.role
            return view(*args, **kwargs)

        return wrapped

    return decorator


@auth_bp.post("/recovery-request")
def recovery_request():
    if not _rate_limit(("recovery", _client_ip()), max_attempts=5, window_seconds=300):
        return _rate_limited_response()
    data = request.get_json(silent=True)
    email = data.get("email") if isinstance(data, dict) else None
    if not isinstance(email, str) or not email.strip() or len(email.strip()) > 120:
        return jsonify(error="A valid email is required."), 400
    student = Student.query.join(User, Student.user_id == User.id).filter(
        db.func.lower(Student.email) == email.strip().lower(), User.role == "student"
    ).first()
    if student and not RecoveryRequest.query.filter_by(
        student_id=student.id, resolved_at=None
    ).first():
        db.session.add(RecoveryRequest(student_id=student.id))
        try:
            db.session.commit()
        except IntegrityError:
            # The unique pending index also deduplicates concurrent requests.
            db.session.rollback()
    response = jsonify(message="If an eligible account exists, a recovery request has been sent to the placement cell.")
    response.headers["Cache-Control"] = "no-store"
    return response


@auth_bp.post("/login")
def login():
    if not _rate_limit(("login", _client_ip()), max_attempts=10, window_seconds=300):
        return _rate_limited_response()
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify(error="Invalid email or password"), 401
    session["user_id"] = user.id
    session["role"] = user.role
    session["name"] = user.name
    return jsonify(user={"id": user.id, "name": user.name, "email": user.email, "role": user.role})


@auth_bp.post("/password")
@login_required()
def change_password():
    data = request.get_json(silent=True) or {}
    current = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    if len(new_password) < 6:
        return jsonify(error="New password must be at least 6 characters."), 400
    user = db.session.get(User, g.user_id)
    if not user or not user.check_password(current):
        return jsonify(error="Current password is incorrect."), 400
    user.set_password(new_password)
    db.session.commit()
    return jsonify(ok=True)


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@auth_bp.get("/me")
def me():
    user = _load_user()
    if not user:
        return jsonify(user=None), 401
    return jsonify(user={"id": user.id, "name": user.name, "email": user.email, "role": user.role})
