"""One-off migration for the feature expansion. Idempotent — safe to re-run.

PostgreSQL edition. On a fresh DB, `db.create_all()` already creates the full
schema; this script only patches older databases and backfills demo data.

1. ALTER drives → add application_deadline (if missing)
2. ALTER students.program / drives.eligible_programs (if missing)
3. Stamp deadlines on drives that don't have one
4. Backfill a login User (role=student, password = roll_no lowercase)
5. Seed sample notices / BCA students when empty

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

FIRST = ["Aarav", "Diya", "Ishaan", "Meera", "Rohan", "Sneha", "Vikram", "Ananya",
         "Karthik", "Priya", "Arjun", "Nisha", "Sanjay", "Divya", "Rahul", "Kavya"]
LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Singh", "Kumar", "Das", "Menon",
        "Joshi", "Verma", "Nair", "Gupta"]


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
        _ensure_enum("student_program", ("B.Tech", "BCA"))
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
            "VARCHAR(100) DEFAULT 'B.Tech, BCA'"
        ))
        print("Added drives.eligible_programs column.")
    else:
        print("drives.eligible_programs already present.")

    # 2 · demo deadlines for drives without one
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

    # 3 · student logins
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

    # 4 · sample notices (only when none exist yet)
    if Notice.query.count() == 0:
        for title, body, audience in SAMPLE_NOTICES:
            db.session.add(Notice(title=title, body=body, audience=audience))
        print("Seeded 3 sample notices.")
    else:
        print("Notices already present.")

    # 5 · BCA demo students with logins (only when none exist yet)
    BCA_SKILLS = ["Python", "PHP", "MySQL", "Web Development", "Excel", "Tally"]
    if Student.query.filter_by(program="BCA").count() == 0:
        for i in range(1, 13):
            first, last = random.choice(FIRST), random.choice(LAST)
            roll = f"23BCA{i:03d}"
            student = Student(
                roll_no=roll,
                name=f"{first} {last}",
                email=f"{first.lower()}.{last.lower()}.bca{i}@college.edu",
                phone=f"9{random.randint(100000000, 999999999)}",
                program="BCA",
                department="BCA",
                cgpa=round(random.uniform(6.0, 9.2), 2),
                graduation_year=2026,
                skills=", ".join(random.sample(BCA_SKILLS, k=3)),
                status="unplaced",
            )
            user = User(
                email=student.email,
                password_hash=generate_password_hash(roll.lower()),
                name=student.name,
                role="student",
            )
            db.session.add(user)
            db.session.flush()
            student.user_id = user.id
            db.session.add(student)
        print("Seeded 12 BCA students with logins.")
    else:
        print("BCA students already present.")

    # 6 · open SE-style drives to BCA (program + department so BCA students pass both checks)
    bca_drives = Drive.query.filter(
        Drive.role.in_(["Software Engineer", "Systems Engineer"])
    ).all()
    opened = 0
    for drive in bca_drives:
        changed = False
        if drive.eligible_programs in (None, "B.Tech"):
            drive.eligible_programs = "B.Tech, BCA"
            changed = True
        depts = drive.eligible_dept_list
        if "BCA" not in depts:
            drive.eligible_departments = ", ".join(depts + ["BCA"])
            changed = True
        if changed:
            opened += 1
    print(f"Opened {opened} SE-style drive(s) to BCA (program + department).")

    db.session.commit()
    print("Migration complete.")
