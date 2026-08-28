"""One-off migration for the feature expansion. Idempotent — safe to re-run.

PostgreSQL edition. On a fresh DB, `db.create_all()` already creates the full
schema; this script only patches older databases and backfills demo data.

1. ALTER drives → add application_deadline (if missing)
2. ALTER students.program / drives.eligible_programs (if missing)
3. Purge the retired BCA program (rows, drive eligibility, enum label)
4. Stamp deadlines on drives that don't have one
5. Backfill a login User (role=student, password = roll_no lowercase)
6. Seed sample notices when empty

Run: ./venv/bin/python migrate.py
"""
import random
from datetime import date, timedelta

from sqlalchemy import text
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Drive, Notice, Student, User

app = create_app()

SAMPLE_NOTICES = [
    ("Placement season 2026 is live",
     "Registrations are open. Keep your profile (phone, skills) up to date — "
     "recruiters shortlist directly from it.",
     "all"),
    ("Resume deadline: 30 Sep",
     "Upload your one-page resume to the placement cell inbox before the deadline "
     "to be considered for the October drives.",
     "students"),
    ("Mock interviews next week",
     "CSE and IT departments: mock interview rounds happen Mon–Wed in the seminar "
     "hall. Sign up with your class advisor.",
     "students"),
]

DEADLINES = [
    ("Amazon Campus Drive 2026", 45),
    ("TCS Campus Drive 2026", 30),
    ("Infosys Campus Drive 2026", 60),
    ("Wipro Campus Drive 2026", -10),   # already passed → shows deadline handling
    ("Zoho Campus Drive 2026", 21),
    ("Freshworks Campus Drive 2026", 14),
]

def _column_exists(table: str, column: str) -> bool:
    return bool(db.session.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = :table "
        "AND column_name = :column"
    ), {"table": table, "column": column}).scalar())


def _ensure_enum(type_name: str, values: tuple[str, ...]) -> None:
    """Create a PostgreSQL ENUM type if it does not already exist."""
    exists = db.session.execute(text(
        "SELECT 1 FROM pg_type WHERE typname = :name"
    ), {"name": type_name}).scalar()
    if exists:
        return
    # Quote labels; values are fixed constants from this file.
    labels = ", ".join(f"'{v}'" for v in values)
    db.session.execute(text(f"CREATE TYPE {type_name} AS ENUM ({labels})"))


with app.app_context():
    # 1 · application_deadline column on drives
    if not _column_exists("drives", "application_deadline"):
        db.session.execute(text(
            "ALTER TABLE drives ADD COLUMN application_deadline DATE NULL"
        ))
        print("Added drives.application_deadline column.")
    else:
        print("drives.application_deadline already present.")

    # 1b · program columns (students.program + drives.eligible_programs)
    if not _column_exists("students", "program"):
        _ensure_enum("student_program", ("B.Tech",))
        db.session.execute(text(
            "ALTER TABLE students ADD COLUMN program student_program "
            "NOT NULL DEFAULT 'B.Tech'"
        ))
        print("Added students.program column.")
    else:
        print("students.program already present.")

    if not _column_exists("drives", "eligible_programs"):
        db.session.execute(text(
            "ALTER TABLE drives ADD COLUMN eligible_programs "
            "VARCHAR(100) DEFAULT 'B.Tech'"
        ))
        print("Added drives.eligible_programs column.")
    else:
        print("drives.eligible_programs already present.")

    # 2 · purge the retired BCA program. Must run before anything loads a
    # Student through the ORM — 'BCA' is no longer a valid Python-side enum
    # member, so SQLAlchemy raises on both reads and filter binds.
    bca_students = db.session.execute(text(
        "SELECT id, user_id FROM students WHERE program::text = 'BCA' OR department = 'BCA'"
    )).all()
    if bca_students:
        student_ids = [row.id for row in bca_students]
        user_ids = [row.user_id for row in bca_students if row.user_id]
        db.session.execute(
            text("DELETE FROM applications WHERE student_id = ANY(:ids)"), {"ids": student_ids}
        )
        db.session.execute(text("DELETE FROM students WHERE id = ANY(:ids)"), {"ids": student_ids})
        if user_ids:
            db.session.execute(text("DELETE FROM users WHERE id = ANY(:ids)"), {"ids": user_ids})
        db.session.flush()
    print(f"Removed {len(bca_students)} BCA student(s).")

    # Drives only ever open to BCA have no audience left — drop them.
    dropped_drives = 0
    for drive in Drive.query.all():
        if drive.eligible_program_list == ["BCA"] or drive.eligible_dept_list == ["BCA"]:
            db.session.execute(
                text("DELETE FROM applications WHERE drive_id = :id"), {"id": drive.id}
            )
            db.session.delete(drive)
            dropped_drives += 1
    db.session.flush()
    print(f"Removed {dropped_drives} BCA-only drive(s).")

    retagged = 0
    for drive in Drive.query.all():
        programs = [p for p in drive.eligible_program_list if p != "BCA"]
        depts = [d for d in drive.eligible_dept_list if d != "BCA"]
        if programs != drive.eligible_program_list or depts != drive.eligible_dept_list:
            drive.eligible_programs = ", ".join(programs) or "B.Tech"
            drive.eligible_departments = ", ".join(depts)
            retagged += 1
    print(f"Stripped BCA eligibility from {retagged} drive(s).")

    # Postgres has no ALTER TYPE ... DROP VALUE, so rebuild the type in place.
    has_bca_label = db.session.execute(text(
        "SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid "
        "WHERE t.typname = 'student_program' AND e.enumlabel = 'BCA'"
    )).scalar()
    if has_bca_label:
        db.session.execute(text("ALTER TABLE students ALTER COLUMN program DROP DEFAULT"))
        db.session.execute(text("ALTER TYPE student_program RENAME TO student_program_old"))
        db.session.execute(text("CREATE TYPE student_program AS ENUM ('B.Tech')"))
        db.session.execute(text(
            "ALTER TABLE students ALTER COLUMN program TYPE student_program "
            "USING program::text::student_program"
        ))
        db.session.execute(text(
            "ALTER TABLE students ALTER COLUMN program SET DEFAULT 'B.Tech'"
        ))
        db.session.execute(text("DROP TYPE student_program_old"))
        print("Dropped 'BCA' from the student_program enum.")
    else:
        print("student_program enum already B.Tech-only.")

    # 3 · demo deadlines for drives without one
    today = date.today()
    stamped = 0
    titles = dict(DEADLINES)
    for drive in Drive.query.filter(Drive.application_deadline.is_(None)).all():
        offset = titles.get(drive.title)
        if offset is None:
            offset = random.randint(7, 90)
        drive.application_deadline = today + timedelta(days=offset)
        stamped += 1
    print(f"Stamped deadlines on {stamped} drive(s).")

    # 4 · student logins
    created = 0
    for student in Student.query.all():
        if student.user_id:
            continue
        user = User(
            email=student.email,
            password_hash=generate_password_hash(student.roll_no.lower()),
            name=student.name,
            role="student",
        )
        db.session.add(user)
        db.session.flush()
        student.user_id = user.id
        created += 1
    print(f"Created {created} student login(s).")

    # 5 · sample notices (only when none exist yet)
    if Notice.query.count() == 0:
        for title, body, audience in SAMPLE_NOTICES:
            db.session.add(Notice(title=title, body=body, audience=audience))
        print("Seeded 3 sample notices.")
    else:
        print("Notices already present.")

    db.session.commit()
    print("Migration complete.")
