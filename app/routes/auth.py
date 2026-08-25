"""Auth API — session-based login/logout/me."""
from functools import wraps

from flask import Blueprint, g, jsonify, request, session
from werkzeug.security import check_password_hash

from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)


def login_required(role=None):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user_id = session.get("user_id")
            if not user_id:
                return jsonify(error="Authentication required"), 401
            if role and session.get("role") != role:
                return jsonify(error="Forbidden"), 403
            g.user_id = user_id
            g.role = session.get("role")
            return view(*args, **kwargs)

        return wrapped

    return decorator


@auth_bp.post("/login")
def login():
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
    if not session.get("user_id"):
        return jsonify(user=None), 401
    return jsonify(user={"id": session["user_id"], "name": session["name"], "role": session["role"]})
