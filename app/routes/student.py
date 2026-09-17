"""Student portal API — profile, drives with eligibility, applications, notices."""
from collections import defaultdict
from datetime import date, datetime
import io

from flask import Blueprint, g, jsonify, request, send_file
from pypdf import PdfReader
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from .auth import login_required
from ..extensions import db
from ..models import (Application, ApplicationStatusHistory, Drive, Notice, Student,
                      StudentResume, PlacementRecord, placement_policy_reason, top_offer_lpa)

portal_bp = Blueprint("portal", __name__)


def _profile_dict(s: Student):
    return {
        "id": s.id,
        "roll_no": s.roll_no,
        "name": s.name,
        "email": s.email,
        "phone": s.phone,
        "program": s.program,
        "department": s.department,
        "cgpa": s.cgpa,
        "graduation_year": s.graduation_year,
        "skills": s.skill_list,
        "status": s.status,
        "resume": s.resume.metadata_dict() if s.resume else None,
    }


def _drive_dict_for(s: Student, d: Drive, application: Application | None = None,
                    policy: str | None = None):
    eligible, reason = d.eligibility_for(s)
    # A placed student is additionally gated by the offer-ladder policy.
    if eligible and policy:
        eligible, reason = False, policy
    applied = application is not None
    return {
        "id": d.id,
        "title": d.title,
        "company_name": d.company.name,
        "company_website": d.company.website,
        "role": d.role,
        "package_lpa": d.package_lpa,
        "min_cgpa": d.min_cgpa,
        "eligible_departments": d.eligible_dept_list,
        "eligible_programs": d.eligible_program_list,
        "drive_date": d.drive_date.isoformat() if d.drive_date else None,
        "application_deadline": d.application_deadline.isoformat() if d.application_deadline else None,
        "accepting": d.is_accepting,
        "eligible": eligible,
        "ineligible_reason": reason,
        "applied": applied,
        "application_status": application.status if application else None,
    }


@portal_bp.get("/summary")
@login_required(role="student")
def summary():
    student = Student.query.filter_by(user_id=g.user_id).first()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404

    applications = Application.query.filter_by(student_id=student.id).all()
    counts = {"applied": 0, "shortlisted": 0, "selected": 0, "rejected": 0}
    for a in applications:
        counts[a.status] = counts.get(a.status, 0) + 1

    today = date.today()
    upcoming = [
        {"id": d.id, "title": d.title, "company_name": d.company.name,
         "deadline": d.application_deadline.isoformat() if d.application_deadline else None,
         "package_lpa": d.package_lpa}
        for d in Drive.query.options(joinedload(Drive.company)).filter(
            Drive.is_active.is_(True),
            Drive.application_deadline.isnot(None),
            Drive.application_deadline >= today,
        ).order_by(Drive.application_deadline).limit(3)
    ]
    notices = [
        {"id": n.id, "title": n.title, "body": n.body,
         "created_at": n.created_at.strftime("%d %b %Y")}
        for n in Notice.query.order_by(Notice.created_at.desc()).limit(3)
    ]

    return jsonify(
        profile=_profile_dict(student),
        application_counts=counts,
        upcoming=upcoming,
        notices=notices,
    )


@portal_bp.get("/drives")
@login_required(role="student")
def drives():
    student = Student.query.filter_by(user_id=g.user_id).first()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404

    applied = {a.drive_id: a for a in Application.query.filter_by(student_id=student.id)}
    top = top_offer_lpa(student.id)
    rows = [
        _drive_dict_for(student, d, applied.get(d.id), placement_policy_reason(top, d))
        for d in Drive.query.options(joinedload(Drive.company)).order_by(Drive.drive_date).all()
    ]
    # Drives a student can still act on come first, soonest deadline leading;
    # closed ones stay visible underneath for reference. is_accepting is a
    # Python property, so this can't be an ORDER BY.
    rows.sort(key=lambda r: (not r["accepting"], r["application_deadline"] or "9999-12-31"))
    return jsonify(drives=rows)


@portal_bp.get("/drives/<int:did>")
@login_required(role="student")
def drive_detail(did):
    student = Student.query.filter_by(user_id=g.user_id).first()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404
    drive = db.get_or_404(Drive, did)
    application = Application.query.filter_by(student_id=student.id, drive_id=drive.id).first()
    policy = placement_policy_reason(top_offer_lpa(student.id), drive)
    return jsonify(drive=_drive_dict_for(student, drive, application, policy))


@portal_bp.post("/drives/<int:did>/apply")
@login_required(role="student")
def apply(did):
    student = Student.query.filter_by(user_id=g.user_id).first()
    drive = db.get_or_404(Drive, did)
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404
    if Application.query.filter_by(student_id=student.id, drive_id=drive.id).first():
        return jsonify(error="Already applied to this drive."), 400

    eligible, reason = drive.eligibility_for(student)
    if not eligible:
        return jsonify(error=f"You are not eligible: {reason}."), 400

    policy = placement_policy_reason(top_offer_lpa(student.id), drive)
    if policy:
        return jsonify(error=f"Placement policy: {policy}"), 400

    app_row = Application(student_id=student.id, drive_id=drive.id, status="applied")
    db.session.add(app_row)
    try:
        db.session.flush()  # need the id before the history row can reference it
        db.session.add(ApplicationStatusHistory(
            application_id=app_row.id, status="applied", changed_by=g.user_id,
        ))
        db.session.commit()
    except IntegrityError:
        # Lost a race with a concurrent request hitting the same unique pair.
        db.session.rollback()
        return jsonify(error="Already applied to this drive."), 400
    return jsonify(application={"id": app_row.id, "status": app_row.status}), 201


MAX_RESUME_BYTES = 2 * 1024 * 1024  # 2 MB


def _student_or_none():
    student = Student.query.filter_by(user_id=g.user_id).first()
    if not student:
        return None
    return student


@portal_bp.get("/resume")
@login_required(role="student")
def resume_metadata():
    student = _student_or_none()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404
    resume = StudentResume.query.filter_by(student_id=student.id).first()
    return jsonify(resume=resume.metadata_dict() if resume else None)


@portal_bp.post("/resume")
@login_required(role="student")
def upload_resume():
    student = _student_or_none()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404
    request.max_content_length = MAX_RESUME_BYTES + 64 * 1024
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify(error="Attach a PDF in the 'file' field."), 400
    filename = secure_filename(file.filename) or "resume.pdf"
    if len(filename) > 255:
        return jsonify(error="Filename must be 255 characters or fewer."), 400
    if not filename.lower().endswith(".pdf"):
        return jsonify(error="Only PDF files are accepted."), 400
    blob = file.read(MAX_RESUME_BYTES + 1)
    if not blob:
        return jsonify(error="The uploaded file is empty."), 400
    if len(blob) > MAX_RESUME_BYTES:
        return jsonify(error="Resume must be 2 MB or smaller."), 413
    try:
        reader = PdfReader(io.BytesIO(blob), strict=True)
        if reader.is_encrypted or not reader.pages:
            raise ValueError("Encrypted or empty PDF")
        for page in reader.pages:
            _ = page.mediabox  # force page-tree parsing before persisting
    except Exception:
        return jsonify(error="That file is not a readable PDF."), 400
    resume = StudentResume.query.filter_by(student_id=student.id).first()
    if resume:
        resume.filename = filename
        resume.content = blob
        resume.size = len(blob)
        resume.updated_at = datetime.utcnow()
    else:
        resume = StudentResume(student_id=student.id, filename=filename,
                               content=blob, size=len(blob))
        db.session.add(resume)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="Could not save the resume. Try again."), 409
    return jsonify(resume=resume.metadata_dict()), 201


@portal_bp.get("/resume/download")
@login_required(role="student")
def download_resume():
    student = _student_or_none()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404
    resume = StudentResume.query.filter_by(student_id=student.id).first()
    if not resume:
        return jsonify(error="No resume uploaded yet."), 404
    response = send_file(io.BytesIO(resume.content), mimetype="application/pdf",
                         as_attachment=True, download_name=resume.filename)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@portal_bp.delete("/resume")
@login_required(role="student")
def delete_resume():
    student = _student_or_none()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404
    resume = StudentResume.query.filter_by(student_id=student.id).first()
    if not resume:
        return jsonify(resume=None)
    db.session.delete(resume)
    db.session.commit()
    return jsonify(resume=None)


@portal_bp.get("/applications")
@login_required(role="student")
def applications():
    student = Student.query.filter_by(user_id=g.user_id).first()
    rows = Application.query \
        .options(
            # Drive and company are read per row below; loading them eagerly
            # keeps this one query instead of two queries per application.
            joinedload(Application.drive).joinedload(Drive.company),
        ) \
        .filter_by(student_id=student.id if student else -1) \
        .join(Drive) \
        .order_by(Application.applied_at.desc()).all()
    offer_map = {}
    if rows:
        # One query for every real offer of this student, keyed by drive —
        # never a PlacementRecord lookup per application row.
        offer_map = {
            record.drive_id: record
            for record in PlacementRecord.query.filter(
                PlacementRecord.student_id == student.id,
                PlacementRecord.drive_id.in_([a.drive_id for a in rows]),
            ).all()
        }
    history = defaultdict(list)
    if rows:
        hs = (ApplicationStatusHistory.query
              .filter(ApplicationStatusHistory.application_id.in_([a.id for a in rows]))
              .order_by(ApplicationStatusHistory.created_at).all())
        for h in hs:
            history[h.application_id].append({
                "status": h.status, "note": h.note,
                "created_at": h.created_at.strftime("%d %b %Y"),
            })
    return jsonify(
        applications=[{
            "id": a.id,
            "drive_id": a.drive_id,
            "title": a.drive.title,
            "role": a.drive.role,
            "company_name": a.drive.company.name,
            "package_lpa": a.drive.package_lpa,
            "drive_date": a.drive.drive_date.isoformat() if a.drive.drive_date else None,
            "status": a.status,
            "applied_at": a.applied_at.strftime("%d %b %Y"),
            "offer": _real_offer_dict(offer_map.get(a.drive_id)),
            "history": history.get(a.id, []),
        } for a in rows]
    )


def _real_offer_dict(record: PlacementRecord | None):
    """Serialize an already-loaded actual offer (no per-row database queries)."""
    if not record:
        return None
    return {
        "package_lpa": record.package_lpa,
        "offered_on": record.offered_on.isoformat() if record.offered_on else None,
    }


@portal_bp.patch("/profile")
@login_required(role="student")
def profile():
    student = Student.query.filter_by(user_id=g.user_id).first()
    if not student:
        return jsonify(error="Student profile not found. Contact the placement cell."), 404
    data = request.get_json(silent=True) or {}
    if "phone" in data:
        student.phone = (data.get("phone") or "").strip() or None
    if "skills" in data:
        skills = data.get("skills")
        student.skills = ", ".join(s.strip() for s in skills if s.strip()) if isinstance(skills, list) else skills
    db.session.commit()
    return jsonify(profile=_profile_dict(student))


@portal_bp.get("/notices")
@login_required(role="student")
def notices():
    rows = Notice.query \
        .filter(Notice.audience.in_(["all", "students"])) \
        .order_by(Notice.created_at.desc()).all()
    return jsonify(
        notices=[{
            "id": n.id, "title": n.title, "body": n.body,
            "created_at": n.created_at.strftime("%d %b %Y"),
        } for n in rows]
    )
