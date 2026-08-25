from datetime import date, datetime

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.Enum("admin", "student", name="user_roles"), default="student")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", back_populates="user", uselist=False)

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    roll_no = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    program = db.Column(db.Enum("B.Tech", "BCA", name="student_program"), default="B.Tech", nullable=False, index=True)
    department = db.Column(db.String(80), nullable=False, index=True)
    cgpa = db.Column(db.Float, nullable=False, default=0.0)
    graduation_year = db.Column(db.Integer, nullable=False)
    skills = db.Column(db.String(500))  # comma-separated
    status = db.Column(
        db.Enum("unplaced", "shortlisted", "selected", name="placement_status"),
        default="unplaced",
        index=True,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="student")
    applications = db.relationship("Application", back_populates="student", lazy="dynamic")

    @property
    def skill_list(self):
        return [s.strip() for s in (self.skills or "").split(",") if s.strip()]


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    industry = db.Column(db.String(80), index=True)
    website = db.Column(db.String(255))
    hr_email = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    drives = db.relationship("Drive", back_populates="company", lazy="dynamic")


class Drive(db.Model):
    """A recruitment drive by a company for a role."""

    __tablename__ = "drives"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    package_lpa = db.Column(db.Float)  # annual CTC in lakhs
    min_cgpa = db.Column(db.Float, default=0.0)
    eligible_departments = db.Column(db.String(300))  # comma-separated
    eligible_programs = db.Column(db.String(100), default="B.Tech, BCA")  # empty/omitted = all programs
    drive_date = db.Column(db.Date)
    application_deadline = db.Column(db.Date, nullable=True)  # open-ended when null
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    company = db.relationship("Company", back_populates="drives")
    applications = db.relationship("Application", back_populates="drive", lazy="dynamic")

    @property
    def eligible_dept_list(self):
        return [d.strip() for d in (self.eligible_departments or "").split(",") if d.strip()]

    @property
    def eligible_program_list(self):
        raw = [p.strip() for p in (self.eligible_programs or "").split(",") if p.strip()]
        return raw or ["B.Tech", "BCA"]

    @property
    def is_accepting(self):
        today = date.today()
        return bool(self.is_active and (self.application_deadline is None or self.application_deadline >= today))

    def eligibility_for(self, student):
        """(eligible: bool, reason: str|None) for a student against this drive."""
        if self.application_deadline and self.application_deadline < date.today():
            return False, "Application deadline passed"
        if not self.is_active:
            return False, "Drive is closed"
        if self.eligible_program_list and student.program not in self.eligible_program_list:
            return False, f"{student.program} students not eligible"
        if self.eligible_dept_list and student.department not in self.eligible_dept_list:
            return False, f"Not open to {student.department}"
        if (self.min_cgpa or 0) > student.cgpa:
            return False, f"Needs CGPA ≥ {self.min_cgpa:g}"
        return True, None


class Application(db.Model):
    __tablename__ = "applications"
    __table_args__ = (db.UniqueConstraint("student_id", "drive_id"),)

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    drive_id = db.Column(db.Integer, db.ForeignKey("drives.id"), nullable=False)
    status = db.Column(
        db.Enum("applied", "shortlisted", "selected", "rejected", name="application_status"),
        default="applied",
        index=True,
    )
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", back_populates="applications")
    drive = db.relationship("Drive", back_populates="applications")


class Notice(db.Model):
    """Announcement posted by the placement cell."""

    __tablename__ = "notices"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    body = db.Column(db.Text, nullable=False)
    audience = db.Column(db.Enum("all", "students", name="notice_audience"), default="students")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
