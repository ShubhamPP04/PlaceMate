"""Seed placement_db (PostgreSQL) with demo data. Run: ./venv/bin/python seed.py

Student portal logins are provisioned with random one-time temp passwords,
printed at the end of the run — redirect to a file if you need to keep them.
"""
import random
import secrets
from datetime import date, datetime, timedelta

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Application, Company, Drive, Notice, Student, User

app = create_app()

DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"]
SKILLS = {
    "CSE": ["Python", "Java", "React", "SQL", "AWS", "Docker"],
    "IT": ["Python", "Networking", "SQL", "Linux", "Cloud"],
    "ECE": ["Embedded C", "VLSI", "IoT", "MATLAB"],
    "EEE": ["Power Systems", "MATLAB", "AutoCAD"],
    "MECH": ["AutoCAD", "SolidWorks", "Thermodynamics"],
    "CIVIL": ["AutoCAD", "STAAD Pro", "Surveying"],
}
COMPANIES = [
    ("TCS", "IT Services"), ("Infosys", "IT Services"), ("Wipro", "IT Services"),
    ("Zoho", "Product"), ("Freshworks", "SaaS"), ("Amazon", "E-commerce"),
    ("Bosch", "Automotive"), ("L&T", "Engineering"),
]
DRIVES = [
    ("Software Engineer", 8.5, 7.0, ["CSE", "IT"], "B.Tech"),
    ("Systems Engineer", 4.5, 6.0, ["CSE", "IT", "ECE"], "B.Tech"),
    ("Data Analyst", 6.0, 6.5, ["CSE", "IT", "ECE", "EEE"], "B.Tech"),
    ("Design Engineer", 5.0, 6.0, ["MECH", "CIVIL", "EEE"], "B.Tech"),
    ("Embedded Engineer", 6.5, 6.5, ["ECE", "EEE"], "B.Tech"),
    ("Web Developer", 4.0, 6.0, ["CSE", "IT"], "B.Tech"),
    ("IT Support Associate", 3.5, 5.5, ["IT", "ECE"], "B.Tech"),
]

FIRST = ["Aarav", "Diya", "Ishaan", "Meera", "Rohan", "Sneha", "Vikram", "Ananya",
         "Karthik", "Priya", "Arjun", "Nisha", "Sanjay", "Divya", "Rahul", "Kavya"]
LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Singh", "Kumar", "Das", "Menon",
        "Joshi", "Verma", "Nair", "Gupta"]

with app.app_context():
    if Student.query.first():
        print("Database already seeded — skipping.")
    else:
        random.seed(42)

        companies = {}
        for name, industry in COMPANIES:
            c = Company(name=name, industry=industry,
                        website=f"https://{name.lower()}.com",
                        hr_email=f"hr@{name.lower()}.com")
            db.session.add(c)
            companies[name] = c
        db.session.flush()

        drives = []
        for (company_name, _industry), (role, lpa, min_cgpa, depts, programs) in [
            (cn, d) for cn in COMPANIES[:6] for d in DRIVES[:2]
        ] + [(COMPANIES[6], DRIVES[5]), (COMPANIES[7], DRIVES[6])]:
            d = Drive(
                company_id=companies[company_name].id,
                title=f"{company_name} Campus Drive 2026",
                role=role, package_lpa=lpa, min_cgpa=min_cgpa,
                eligible_departments=", ".join(depts),
                eligible_programs=programs,
                drive_date=date(2026, random.randint(1, 12), random.randint(1, 28)),
                application_deadline=date.today() + timedelta(days=random.randint(7, 75)),
                is_active=random.random() > 0.25,
            )
            db.session.add(d)
            drives.append(d)
        db.session.flush()

        students = []
        for i in range(1, 61):
            dept = random.choice(DEPARTMENTS)
            first, last = random.choice(FIRST), random.choice(LAST)
            s = Student(
                roll_no=f"22{dept}{i:03d}",
                name=f"{first} {last}",
                email=f"{first.lower()}.{last.lower()}{i}@college.edu",
                phone=f"9{random.randint(100000000, 999999999)}",
                program="B.Tech",
                department=dept,
                cgpa=round(random.uniform(5.5, 9.6), 2),
                graduation_year=2026,
                skills=", ".join(random.sample(SKILLS[dept], k=min(3, len(SKILLS[dept])))),
                status="unplaced",
            )
            db.session.add(s)
            students.append(s)
        db.session.flush()

        # Applications: eligible students apply to some active drives
        now = datetime.utcnow()
        n_apps = 0
        for s in students:
            for d in drives:
                if not d.is_active:
                    continue
                if s.program not in d.eligible_program_list:
                    continue
                if s.department not in d.eligible_dept_list or s.cgpa < (d.min_cgpa or 0):
                    continue
                if random.random() < 0.35:
                    status = random.choices(
                        ["applied", "shortlisted", "selected", "rejected"],
                        weights=[45, 20, 15, 20],
                    )[0]
                    db.session.add(Application(
                        student_id=s.id, drive_id=d.id, status=status,
                        applied_at=now - timedelta(days=random.randint(1, 300)),
                    ))
                    n_apps += 1
                    # mirror onto student status
                    if status == "selected":
                        s.status = "selected"
                    elif status == "shortlisted" and s.status == "unplaced":
                        s.status = "shortlisted"

        db.session.commit()
        db.session.add(Notice(
            title="Placement season 2026 is live",
            body="Registrations are open. Keep your profile (phone, skills) up to date — "
                 "recruiters shortlist directly from it.",
            audience="all",
        ))
        db.session.add(Notice(
            title="Resume deadline: 30 Sep",
            body="Upload your one-page resume to the placement cell inbox before the deadline "
                 "to be considered for the October drives.",
            audience="students",
        ))
        db.session.add(Notice(
            title="Mock interviews next week",
            body="CSE and IT departments: mock interview rounds happen Mon–Wed in the seminar "
                 "hall. Sign up with your class advisor.",
            audience="students",
        ))
        # Student portal logins — random one-time temp passwords.
        issued = []
        for s in students:
            temp_password = secrets.token_urlsafe(8)
            user = User(
                email=s.email,
                password_hash=generate_password_hash(temp_password),
                name=s.name,
                role="student",
            )
            db.session.add(user)
            db.session.flush()
            s.user_id = user.id
            issued.append((s.email, temp_password))
        db.session.commit()
        print(f"Seeded: {len(companies)} companies, {len(drives)} drives, "
              f"{len(students)} students, {n_apps} applications, 3 notices.")
        print(f"Provisioned {len(issued)} student login(s); temp passwords below.")
        for email, pw in issued:
            print(f"  {email}  {pw}")
