"""Auth API — session-based login/logout/me."""
from functools import wraps

from flask import Blueprint, g, jsonify, request, session
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash

from ..extensions import db
from ..models import RecoveryRequest, Student, User

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


@auth_bp.post("/recovery-request")
def recovery_request():
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
