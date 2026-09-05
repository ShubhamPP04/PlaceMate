"""Admin / Placement Cell API — dashboard stats, students, companies, drives, applications."""
import io
import logging
import secrets
from collections import Counter, defaultdict
from datetime import date, timedelta

import pandas as pd
from flask import Blueprint, jsonify, request, send_file
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from werkzeug.security import generate_password_hash

log = logging.getLogger(__name__)


def _save_error(exc, fallback="Could not save changes. The data may conflict with an existing record.",
                status=409):
    """Log the raw DB exception, return a client-safe message (no SQL internals)."""
    log.warning("DB write failed: %s", exc)
    db.session.rollback()
    return jsonify(error=fallback), status


def _csv_safe(v):
    """Neutralize spreadsheet formula injection (=,+,-,@ leading cells)."""
    if isinstance(v, str) and v[:1] in ("=", "+", "-", "@"):
        return "'" + v
    return v

from .auth import login_required
from ..extensions import db
from ..models import PROGRAMS, Application, Company, Drive, Notice, Student, User

admin_bp = Blueprint("admin", __name__)


def _student_dict(s: Student):
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
    }


def _company_dict(c: Company):
    return {
        "id": c.id,
        "name": c.name,
        "industry": c.industry,
        "website": c.website,
        "hr_email": c.hr_email,
        "drives_count": c.drives.count(),
    }


def _drive_dict(d: Drive):
    return {
        "id": d.id,
        "company_id": d.company_id,
        "company_name": d.company.name,
        "company_website": d.company.website,
        "title": d.title,
        "role": d.role,
        "package_lpa": d.package_lpa,
        "min_cgpa": d.min_cgpa,
        "eligible_departments": d.eligible_dept_list,
        "eligible_programs": d.eligible_program_list,
        "drive_date": d.drive_date.isoformat() if d.drive_date else None,
        "application_deadline": d.application_deadline.isoformat() if d.application_deadline else None,
        "is_active": d.is_active,
        "is_accepting": d.is_accepting,
        "applications_count": d.applications.count(),
    }


def _application_dict(a: Application):
    eligible, reason = a.drive.eligibility_for(a.student)
    return {
        "id": a.id,
        "student_id": a.student_id,
        "student_name": a.student.name,
        "roll_no": a.student.roll_no,
        "department": a.student.department,
        "drive_id": a.drive_id,
        "drive_role": a.drive.role,
        "company_id": a.drive.company_id,
        "company_name": a.drive.company.name,
        "company_website": a.drive.company.website,
        "status": a.status,
        "eligible": eligible,
        "ineligible_reason": reason,
        "applied_at": a.applied_at.strftime("%d %b %Y"),
    }


# ---------------------------------------------------------------- dashboard

@admin_bp.get("/dashboard")
@login_required(role="admin")
def dashboard():
    students = Student.query.all()
    companies_count = Company.query.count()
    drives = Drive.query.all()
    # joinedload kills the N+1 lazy loads in the loops below
    applications = Application.query.options(
        joinedload(Application.student),
        joinedload(Application.drive).joinedload(Drive.company),
    ).all()

    total_students = len(students)
    selected = sum(1 for s in students if s.status == "selected")
    shortlisted = sum(1 for s in students if s.status == "shortlisted")
    unplaced = total_students - selected - shortlisted
    active_drives = sum(1 for d in drives if d.is_active)
    placement_pct = round(selected / total_students * 100, 1) if total_students else 0.0

    selected_packages = [a.drive.package_lpa for a in applications
                         if a.status == "selected" and a.drive.package_lpa]
    highest_package = max(selected_packages) if selected_packages else None
    avg_package_overall = round(sum(selected_packages) / len(selected_packages), 2) if selected_packages else None

    week_ago = date.today() - timedelta(days=7)
    prev_week_start = week_ago - timedelta(days=7)

    # Weekly deltas — applications this week vs prior full week (delta pills)
    apps_this_week = sum(1 for a in applications if a.applied_at and a.applied_at.date() >= week_ago)
    apps_prev_week = sum(
        1 for a in applications
        if a.applied_at and prev_week_start <= a.applied_at.date() < week_ago
    )

    def _delta(current, previous):
        if not previous:
            return None
        return round((current - previous) / previous * 100, 1)

    weekly_deltas = {"applications": _delta(apps_this_week, apps_prev_week)}

    # Skill demand — skills across shortlisted/selected applications
    skill_counter = Counter()
    for a in applications:
        if a.status in ("selected", "shortlisted"):
            for skill in a.student.skill_list:
                skill_counter[skill.title()] += 1
    top_skills = skill_counter.most_common(8)

    # Department statistics via pandas
    df = pd.DataFrame(
        [{"department": s.department, "status": s.status, "cgpa": s.cgpa} for s in students]
    )
    dept_stats = []
    if not df.empty:
        grouped = df.groupby("department").agg(total=("status", "size"), avg_cgpa=("cgpa", "mean"))
        placed = df[df["status"] == "selected"].groupby("department").size().rename("selected")
        grouped = grouped.join(placed).fillna({"selected": 0})
        grouped["pct"] = (grouped["selected"] / grouped["total"] * 100).round(1)
        dept_stats = [
            {
                "department": r.department,
                "total": int(r.total),
                "avg_cgpa": round(float(r.avg_cgpa), 2),
                "selected": int(r.selected),
                "pct": float(r.pct),
            }
            for r in grouped.sort_values("pct", ascending=False).reset_index().itertuples()
        ]

    # Chart datasets — monthly counts sorted chronologically
    app_status_counts = Counter(a.status for a in applications)
    monthly = Counter()
    month_keys = {}
    for a in applications:
        label = a.applied_at.strftime("%b %y")
        monthly[label] += 1
        month_keys[label] = a.applied_at.strftime("%Y-%m")
    monthly = dict(sorted(monthly.items(), key=lambda kv: month_keys[kv[0]]))
    company_apps = Counter(a.drive.company.name for a in applications).most_common(6)

    pkg_by_dept = defaultdict(list)
    for a in applications:
        if a.status == "selected" and a.drive.package_lpa:
            pkg_by_dept[a.student.department].append(a.drive.package_lpa)
    avg_package = sorted((dept, round(sum(v) / len(v), 2)) for dept, v in pkg_by_dept.items())

    return jsonify(
        stats={
            "total_students": total_students,
            "total_companies": companies_count,
            "active_drives": active_drives,
            "applications": len(applications),
            "shortlisted": shortlisted,
            "selected": selected,
            "unplaced": unplaced,
            "highest_package": highest_package,
            "avg_package_overall": avg_package_overall,
            "placement_pct": placement_pct,
            "deltas": weekly_deltas,        },
        top_skills=top_skills,
        dept_stats=dept_stats,
        charts={
            "appFunnel": {
                "labels": ["Applied", "Shortlisted", "Selected", "Rejected"],
                "values": [app_status_counts.get(k, 0) for k in ("applied", "shortlisted", "selected", "rejected")],
            },
            "monthlyApps": {"labels": list(monthly.keys()), "values": list(monthly.values())},
            "topSkills": {"labels": [s for s, _ in top_skills], "values": [c for _, c in top_skills]},
            "topCompanies": {"labels": [c for c, _ in company_apps], "values": [n for _, n in company_apps]},
            "avgPackage": {"labels": [d for d, _ in avg_package], "values": [v for _, v in avg_package]},
            "deptPlacement": {
                "labels": [r["department"] for r in dept_stats],
                "values": [r["pct"] for r in dept_stats],
            },
        },
    )


# ------------------------------------------------------------------ students

@admin_bp.get("/students")
@login_required(role="admin")
def list_students():
    q = request.args.get("q", "").strip()
    dept = request.args.get("dept", "")
    status = request.args.get("status", "")
    program = request.args.get("program", "")

    query = Student.query
    if q:
        query = query.filter(db.or_(Student.name.ilike(f"%{q}%"), Student.roll_no.ilike(f"%{q}%")))
    if dept:
        query = query.filter(Student.department == dept)
    if status:
        query = query.filter(Student.status == status)
    if program:
        query = query.filter(Student.program == program)

    departments = sorted({r[0] for r in Student.query.with_entities(Student.department).distinct()})
    programs = sorted({r[0] for r in Student.query.with_entities(Student.program).distinct()})
    return jsonify(
        students=[_student_dict(s) for s in query.order_by(Student.roll_no).all()],
        departments=departments,
        programs=programs,
    )


@admin_bp.post("/students")
@login_required(role="admin")
def add_student():
    data = request.get_json(silent=True) or {}
    try:
        student = Student(
            roll_no=data["roll_no"].strip(),
            name=data["name"].strip(),
            email=data["email"].strip().lower(),
            phone=data.get("phone", "").strip() or None,
            program=data.get("program") if data.get("program") in PROGRAMS else "B.Tech",
            department=data["department"].strip(),
            cgpa=float(data.get("cgpa") or 0),
            graduation_year=int(data.get("graduation_year") or 2027),
            skills=", ".join(data.get("skills", [])) if isinstance(data.get("skills"), list) else data.get("skills", ""),
        )
        # Provision a student login with a one-time random password.
        _, temp_password = _ensure_student_user(student)
        db.session.add(student)
        db.session.flush()
        db.session.commit()
        return jsonify(student={**_student_dict(student), "temp_password": temp_password}), 201
    except KeyError as exc:
        return jsonify(error=f"Missing field: {exc.args[0]}"), 400
    except IntegrityError as exc:
        return _save_error(exc, "A student with that roll number or email already exists.")
    except (TypeError, ValueError) as exc:
        return _save_error(exc, f"Invalid value: {exc}")


@admin_bp.delete("/students/<int:sid>")
@login_required(role="admin")
def delete_student(sid):
    student = db.get_or_404(Student, sid)
    # Children first: applications reference this student (FK + NOT NULL),
    # then the linked login User so no orphaned account survives the delete.
    Application.query.filter_by(student_id=student.id).delete(synchronize_session=False)
    user = db.session.get(User, student.user_id) if student.user_id else None
    if user:
        db.session.delete(user)
    db.session.delete(student)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _save_error(exc, "Could not delete this student.")
    return jsonify(ok=True)


def _ensure_student_user(student):
    """Return (user, temp_password), linking or creating the login for a Student.

    temp_password is set only when a *new* login is created (random one-time
    password shown to the admin once); None when the login already exists.
    Caller commits.
    """
    if student.user_id:
        user = db.session.get(User, student.user_id)
        if user:
            if user.email != student.email:
                user.email = student.email
            if user.name != student.name:
                user.name = student.name
            return user, None
    temp_password = secrets.token_urlsafe(8)
    user = User(
        email=student.email,
        password_hash=generate_password_hash(temp_password),
        name=student.name,
        role="student",
    )
    db.session.add(user)
    db.session.flush()
    student.user_id = user.id
    return user, temp_password


@admin_bp.put("/students/<int:sid>")
@login_required(role="admin")
def update_student(sid):
    student = db.get_or_404(Student, sid)
    data = request.get_json(silent=True) or {}
    try:
        if "roll_no" in data:
            student.roll_no = data["roll_no"].strip()
        if "name" in data:
            student.name = data["name"].strip()
        if "email" in data:
            student.email = data["email"].strip().lower()
        if "phone" in data:
            student.phone = (data.get("phone") or "").strip() or None
        if "program" in data:
            if data["program"] not in PROGRAMS:
                return jsonify(error=f"Invalid program: {data.get('program')}"), 400
            student.program = data["program"]
        if "department" in data:
            student.department = data["department"].strip()
        if "cgpa" in data:
            student.cgpa = float(data.get("cgpa") or 0)
        if "graduation_year" in data:
            student.graduation_year = int(data.get("graduation_year") or 2027)
        if "skills" in data:
            skills = data.get("skills")
            student.skills = ", ".join(s.strip() for s in skills if s.strip()) if isinstance(skills, list) else skills
        if student.user_id:  # keep the login email/name in sync
            user = db.session.get(User, student.user_id)
            if user:
                user.name = student.name
                user.email = student.email
        else:
            _ensure_student_user(student)
        db.session.commit()
        return jsonify(student=_student_dict(student))
    except IntegrityError as exc:
        return _save_error(exc, "Another student already has that roll number or email.")
    except (TypeError, ValueError) as exc:
        return _save_error(exc, f"Invalid value: {exc}")


@admin_bp.post("/students/<int:sid>/reset-password")
@login_required(role="admin")
def reset_student_password(sid):
    student = db.get_or_404(Student, sid)
    user, _ = _ensure_student_user(student)
    temp_password = secrets.token_urlsafe(8)
    user.password_hash = generate_password_hash(temp_password)
    db.session.commit()
    return jsonify(temp_password=temp_password)


REQUIRED_CSV = {"roll_no", "name", "email", "department"}


@admin_bp.post("/students/import")
@login_required(role="admin")
def import_students():
    file = request.files.get("file")
    if not file:
        return jsonify(error="Missing CSV file (field 'file')."), 400
    text = file.read().decode("utf-8-sig", errors="replace")
    try:
        # dtype=str keeps pandas from inferring types: a numeric phone or roll
        # number column would otherwise arrive as int and break the .strip()s.
        df = pd.read_csv(io.StringIO(text), dtype=str)
    except Exception:
        return jsonify(error="Could not parse CSV."), 400
    if not REQUIRED_CSV.issubset({c.strip() for c in df.columns}):
        return jsonify(error="CSV must contain columns: " + ", ".join(sorted(REQUIRED_CSV))), 400
    if len(df) > 5000:
        return jsonify(error="CSV too large — import at most 5000 rows at a time."), 400

    existing = {s.roll_no for s in Student.query.with_entities(Student.roll_no)}
    existing_emails = {s.email for s in Student.query.with_entities(Student.email)}
    created, skipped = 0, []
    credentials = []  # one-time passwords for newly provisioned logins
    for i, row in df.iterrows():
        idx = i + 2  # 1-based row + header
        record = {str(c).strip(): ("" if pd.isna(v) else v) for c, v in row.items()}
        roll = (record.get("roll_no") or "").strip()
        email = (record.get("email") or "").strip().lower()
        dept = (record.get("department") or "").strip()
        name = (record.get("name") or "").strip()
        try:
            cgpa = float(record.get("cgpa") or 0)
        except (TypeError, ValueError):
            cgpa = 0.0
        try:
            grad = int(float(record.get("graduation_year") or 2027))
        except (TypeError, ValueError):
            grad = 2027
        if not (roll and email and name and dept):
            skipped.append({"row": idx, "error": "Missing required field (roll_no/name/email/department)"})
            continue
        if roll in existing:
            skipped.append({"row": idx, "error": "Duplicate roll_no"})
            continue
        if email in existing_emails:
            skipped.append({"row": idx, "error": "Duplicate email"})
            continue
        student = Student(
            roll_no=roll, name=name, email=email,
            phone=(record.get("phone") or "").strip() or None,
            program=record.get("program").strip() if record.get("program", "").strip() in PROGRAMS else "B.Tech",
            department=dept, cgpa=cgpa, graduation_year=grad,
            skills=record.get("skills") if record.get("skills") else "",
        )
        _, temp_password = _ensure_student_user(student)
        db.session.add(student)
        credentials.append({"email": email, "temp_password": temp_password})
        existing.add(roll)
        existing_emails.add(email)
        created += 1

    try:
        db.session.commit()
    except IntegrityError as exc:
        return _save_error(exc, "Import failed — a row conflicts with existing data.")
    return jsonify(created=created, skipped=skipped, temp_passwords=credentials)


# ----------------------------------------------------------------- companies

@admin_bp.get("/companies")
@login_required(role="admin")
def list_companies():
    q = request.args.get("q", "").strip()
    query = Company.query
    if q:
        query = query.filter(Company.name.ilike(f"%{q}%"))
    return jsonify(companies=[_company_dict(c) for c in query.order_by(Company.name)])


@admin_bp.get("/companies/<int:cid>")
@login_required(role="admin")
def company_detail(cid):
    company = db.get_or_404(Company, cid)
    return jsonify(
        company={
            **_company_dict(company),
            "drives": [_drive_dict(d) for d in company.drives.order_by(Drive.drive_date.desc())],
        }
    )


@admin_bp.post("/companies")
@login_required(role="admin")
def add_company():
    data = request.get_json(silent=True) or {}
    try:
        company = Company(
            name=data["name"].strip(),
            industry=data.get("industry", "").strip() or None,
            website=data.get("website", "").strip() or None,
            hr_email=data.get("hr_email", "").strip() or None,
        )
        db.session.add(company)
        db.session.commit()
        return jsonify(company=_company_dict(company)), 201
    except KeyError:
        return jsonify(error="Missing field: name"), 400
    except IntegrityError as exc:
        return _save_error(exc, "A company with that name already exists.")


@admin_bp.put("/companies/<int:cid>")
@login_required(role="admin")
def update_company(cid):
    company = db.get_or_404(Company, cid)
    data = request.get_json(silent=True) or {}
    try:
        if "name" in data:
            company.name = data["name"].strip()
        if "industry" in data:
            company.industry = (data.get("industry") or "").strip() or None
        if "website" in data:
            company.website = (data.get("website") or "").strip() or None
        if "hr_email" in data:
            company.hr_email = (data.get("hr_email") or "").strip() or None
        db.session.commit()
        return jsonify(company=_company_dict(company))
    except IntegrityError as exc:
        return _save_error(exc, "A company with that name already exists.")


@admin_bp.delete("/companies/<int:cid>")
@login_required(role="admin")
def delete_company(cid):
    company = db.get_or_404(Company, cid)
    # Children first: applications of every drive of this company, then the
    # drives (FK drives.company_id is NOT NULL), then the company itself.
    drive_ids = [d.id for d in company.drives]
    if drive_ids:
        Application.query.filter(Application.drive_id.in_(drive_ids)).delete(synchronize_session=False)
        Drive.query.filter(Drive.id.in_(drive_ids)).delete(synchronize_session=False)
    db.session.delete(company)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _save_error(exc, "Could not delete this company.")
    return jsonify(ok=True)


# -------------------------------------------------------------------- drives

@admin_bp.get("/drives")
@login_required(role="admin")
def list_drives():
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "")  # active | closed
    company_id = request.args.get("company", "").strip()

    query = Drive.query.options(joinedload(Drive.company))
    if q:
        query = query.filter(db.or_(
            Drive.title.ilike(f"%{q}%"),
            Drive.role.ilike(f"%{q}%"),
            Company.name.ilike(f"%{q}%"),
        ))
    if company_id:
        query = query.filter(Drive.company_id == int(company_id))
    if status == "active":
        query = query.filter(Drive.is_active.is_(True))
    elif status == "closed":
        query = query.filter(Drive.is_active.is_(False))
    query = query.join(Company)
    drives = query.order_by(Drive.is_active.desc(), Drive.drive_date).all()

    companies = [{"id": c.id, "name": c.name} for c in Company.query.order_by(Company.name)]
    return jsonify(drives=[_drive_dict(d) for d in drives], companies=companies)


@admin_bp.get("/drives/<int:did>")
@login_required(role="admin")
def drive_detail(did):
    drive = db.get_or_404(Drive, did)
    return jsonify(
        drive={
            **_drive_dict(drive),
            "applications": [
                _application_dict(a) for a in drive.applications.order_by(Application.applied_at.desc())
            ],
        }
    )


@admin_bp.post("/drives")
@login_required(role="admin")
def add_drive():
    data = request.get_json(silent=True) or {}
    try:
        drive = Drive(
            company_id=int(data["company_id"]),
            title=data["title"].strip(),
            role=data["role"].strip(),
            package_lpa=float(data.get("package_lpa") or 0) or None,
            min_cgpa=float(data.get("min_cgpa") or 0),
            eligible_departments=", ".join(data["eligible_departments"])
            if isinstance(data.get("eligible_departments"), list)
            else data.get("eligible_departments", ""),
            eligible_programs=", ".join(data["eligible_programs"])
            if isinstance(data.get("eligible_programs"), list)
            else data.get("eligible_programs", "B.Tech"),
            drive_date=date.fromisoformat(data["drive_date"]) if data.get("drive_date") else None,
            application_deadline=date.fromisoformat(data["application_deadline"])
            if data.get("application_deadline") else None,
        )
        db.session.add(drive)
        db.session.commit()
        return jsonify(drive=_drive_dict(drive)), 201
    except KeyError as exc:
        return jsonify(error=f"Missing field: {exc.args[0]}"), 400
    except IntegrityError as exc:
        return _save_error(exc)
    except (TypeError, ValueError) as exc:
        return _save_error(exc, f"Invalid value: {exc}", 400)


@admin_bp.put("/drives/<int:did>")
@login_required(role="admin")
def update_drive(did):
    drive = db.get_or_404(Drive, did)
    data = request.get_json(silent=True) or {}
    try:
        if "company_id" in data:
            drive.company_id = int(data["company_id"])
        if "title" in data:
            drive.title = data["title"].strip()
        if "role" in data:
            drive.role = data["role"].strip()
        if "package_lpa" in data:
            drive.package_lpa = float(data.get("package_lpa") or 0) or None
        if "min_cgpa" in data:
            drive.min_cgpa = float(data.get("min_cgpa") or 0)
        if "eligible_departments" in data:
            depts = data.get("eligible_departments")
            drive.eligible_departments = ", ".join(depts) if isinstance(depts, list) else depts or ""
        if "eligible_programs" in data:
            programs = data.get("eligible_programs")
            drive.eligible_programs = ", ".join(programs) if isinstance(programs, list) else programs or ""
        if "drive_date" in data:
            drive.drive_date = date.fromisoformat(data["drive_date"]) if data.get("drive_date") else None
        if "application_deadline" in data:
            drive.application_deadline = date.fromisoformat(data["application_deadline"]) \
                if data.get("application_deadline") else None
        db.session.commit()
        return jsonify(drive=_drive_dict(drive))
    except IntegrityError as exc:
        return _save_error(exc)
    except (TypeError, ValueError) as exc:
        return _save_error(exc, f"Invalid value: {exc}", 400)


@admin_bp.delete("/drives/<int:did>")
@login_required(role="admin")
def delete_drive(did):
    drive = db.get_or_404(Drive, did)
    # Applications reference the drive (FK + NOT NULL) — remove them first.
    Application.query.filter_by(drive_id=drive.id).delete(synchronize_session=False)
    db.session.delete(drive)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _save_error(exc, "Could not delete this drive.")
    return jsonify(ok=True)


@admin_bp.post("/drives/<int:did>/toggle")
@login_required(role="admin")
def toggle_drive(did):
    drive = db.get_or_404(Drive, did)
    drive.is_active = not drive.is_active
    db.session.commit()
    return jsonify(drive=_drive_dict(drive))


@admin_bp.get("/drives/<int:did>/targets")
@login_required(role="admin")
def drive_targets(did):
    """Students eligible for this drive who have not yet applied."""
    drive = db.get_or_404(Drive, did)
    applied_ids = {a.student_id for a in drive.applications}
    rows = []
    for s in Student.query.order_by(Student.roll_no):
        if s.id in applied_ids:
            continue
        eligible, reason = drive.eligibility_for(s)
        if eligible:
            rows.append({
                "id": s.id, "roll_no": s.roll_no, "name": s.name,
                "department": s.department, "cgpa": s.cgpa, "skills": s.skill_list,
            })
    return jsonify(targets=rows)


# -------------------------------------------------------------- applications

@admin_bp.get("/applications")
@login_required(role="admin")
def list_applications():
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "")

    query = Application.query.join(Student).join(Drive).join(Company)
    if q:
        query = query.filter(db.or_(
            Student.name.ilike(f"%{q}%"),
            Student.roll_no.ilike(f"%{q}%"),
            Company.name.ilike(f"%{q}%"),
            Drive.role.ilike(f"%{q}%"),
        ))
    if status:
        query = query.filter(Application.status == status)
    rows = query.order_by(Application.applied_at.desc()).all()
    return jsonify(applications=[_application_dict(a) for a in rows])


@admin_bp.get("/applications/<int:aid>")
@login_required(role="admin")
def application_detail(aid):
    app_row = db.get_or_404(Application, aid)
    return jsonify(
        application={
            **_application_dict(app_row),
            "student": _student_dict(app_row.student),
            "drive": _drive_dict(app_row.drive),
        }
    )


@admin_bp.post("/applications/<int:aid>/status")
@login_required(role="admin")
def set_application_status(aid):
    new_status = (request.get_json(silent=True) or {}).get("status")
    if new_status not in ("applied", "shortlisted", "selected", "rejected"):
        return jsonify(error="Invalid status"), 400
    app_row = db.get_or_404(Application, aid)
    app_row.status = new_status
    # Mirror onto the student's overall placement status, recomputed from all
    # of their applications so later transitions (e.g. select → rejected) roll
    # the mirror back instead of leaving a stale "selected".
    student = app_row.student
    statuses = {a.status for a in Application.query.filter_by(student_id=student.id)}
    if "selected" in statuses:
        student.status = "selected"
    elif "shortlisted" in statuses:
        student.status = "shortlisted"
    else:
        student.status = "unplaced"
    db.session.commit()
    return jsonify(application=_application_dict(app_row))


# ------------------------------------------------------------------ notices

@admin_bp.get("/notices")
@login_required(role="admin")
def list_notices():
    rows = Notice.query.order_by(Notice.created_at.desc()).all()
    return jsonify(notices=[{
        "id": n.id, "title": n.title, "body": n.body, "audience": n.audience,
        "created_at": n.created_at.strftime("%d %b %Y"),
    } for n in rows])


@admin_bp.post("/notices")
@login_required(role="admin")
def add_notice():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip()
    audience = data.get("audience") if data.get("audience") in ("all", "students") else "students"
    if not title or not body:
        return jsonify(error="Title and body are required."), 400
    notice = Notice(title=title, body=body, audience=audience)
    db.session.add(notice)
    db.session.commit()
    return jsonify(notice={
        "id": notice.id, "title": notice.title, "body": notice.body, "audience": notice.audience,
        "created_at": notice.created_at.strftime("%d %b %Y"),
    }), 201


@admin_bp.delete("/notices/<int:nid>")
@login_required(role="admin")
def delete_notice(nid):
    notice = db.get_or_404(Notice, nid)
    db.session.delete(notice)
    db.session.commit()
    return jsonify(ok=True)


# -------------------------------------------------------------------- export

EXPORTERS = {
    "students": {"title": "students", "columns": [
        "roll_no", "name", "email", "phone", "department", "cgpa",
        "graduation_year", "skills", "status",
    ]},
    "companies": {"title": "companies", "columns": [
        "name", "industry", "website", "hr_email", "drives_count",
    ]},
    "drives": {"title": "drives", "columns": [
        "id", "title", "company", "role", "package_lpa", "min_cgpa",
        "eligible_departments", "drive_date", "application_deadline",
        "is_active", "is_accepting", "applications_count",
    ]},
    "applications": {"title": "applications", "columns": [
        "id", "student", "roll_no", "department", "company", "role",
        "status", "applied_at",
    ]},
}


def _export_frame(entity):
    if entity == "students":
        rows = [{
            "roll_no": s.roll_no, "name": s.name, "email": s.email, "phone": s.phone or "",
            "program": s.program, "department": s.department, "cgpa": s.cgpa,
            "graduation_year": s.graduation_year,
            "skills": ", ".join(s.skill_list), "status": s.status,
        } for s in Student.query.order_by(Student.roll_no)]
        return pd.DataFrame([{k: _csv_safe(v) for k, v in r.items()} for r in rows])
    if entity == "companies":
        return pd.DataFrame([{
            "name": _csv_safe(c.name), "industry": _csv_safe(c.industry),
            "website": _csv_safe(c.website),
            "hr_email": _csv_safe(c.hr_email), "drives_count": c.drives.count(),
        } for c in Company.query.order_by(Company.name)])
    if entity == "drives":
        return pd.DataFrame([{
            "id": d.id, "title": _csv_safe(d.title), "company": _csv_safe(d.company.name),
            "role": _csv_safe(d.role),
            "package_lpa": d.package_lpa, "min_cgpa": d.min_cgpa,
            "eligible_departments": d.eligible_departments or "",
            "eligible_programs": d.eligible_programs or "",
            "drive_date": d.drive_date.isoformat() if d.drive_date else "",
            "application_deadline": d.application_deadline.isoformat() if d.application_deadline else "",
            "is_active": d.is_active, "is_accepting": d.is_accepting,
            "applications_count": d.applications.count(),
        } for d in Drive.query.order_by(Drive.drive_date)])
    # applications
    return pd.DataFrame([{
        "id": a.id, "student": _csv_safe(a.student.name), "roll_no": a.student.roll_no,
        "department": a.student.department, "company": _csv_safe(a.drive.company.name),
        "role": _csv_safe(a.drive.role), "status": a.status,
        "applied_at": a.applied_at.strftime("%d %b %Y") if a.applied_at else "",
    } for a in Application.query.order_by(Application.applied_at.desc())])


@admin_bp.get("/export/<entity>")
@login_required(role="admin")
def export(entity):
    if entity not in EXPORTERS:
        return jsonify(error="Unknown entity: " + entity), 400
    df = _export_frame(entity)
    cols = EXPORTERS[entity]["columns"]
    if entity == "students":
        cols = df.columns.tolist()
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return send_file(
        io.BytesIO(buf.getvalue().encode("utf-8-sig")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"placemate_{entity}.csv",
    )

