"""Backend contracts against fresh SQLite only; never invoke the app factory."""
import csv
import io
import unittest
from datetime import date

from flask import Flask
from pypdf import PdfWriter

from app.extensions import db
from app.models import (Application, ApplicationStatusHistory, Company, Drive,
                        PlacementRecord, RecoveryRequest, Student, StudentResume, User)
from app.routes.student import MAX_RESUME_BYTES
from app.routes.admin import admin_bp
from app.routes.auth import _ATTEMPTS, auth_bp
from app.routes.student import portal_bp


class BackendContracts(unittest.TestCase):
    def setUp(self):
        _ATTEMPTS.clear()  # rate limiter is process-global; isolate each test
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, SECRET_KEY="isolated-test-only",
                               SQLALCHEMY_DATABASE_URI="sqlite:///:memory:")
        db.init_app(self.app)
        for bp, prefix in [(auth_bp, "/auth"), (admin_bp, "/admin"), (portal_bp, "/portal")]:
            self.app.register_blueprint(bp, url_prefix=prefix)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.session.execute(db.text("PRAGMA foreign_keys=ON"))
        db.create_all()
        admin = User(email="admin@test.test", name="Admin", role="admin")
        admin.set_password("adminpass")
        db.session.add(admin)
        self.students = []
        for i in range(2):
            user = User(email=f"student{i}@test.test", name=f"Student {i}", role="student")
            user.set_password("originalpass")
            db.session.add(user)
            db.session.flush()
            student = Student(user_id=user.id, email=user.email, name=user.name,
                              roll_no=f"00{i}", department="CSE" if i == 0 else "ECE",
                              cgpa=8, graduation_year=2027, program="B.Tech")
            db.session.add(student)
            self.students.append(student)
        db.session.commit()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.session.remove()
        db.engine.dispose()
        self.ctx.pop()

    def login(self, email="admin@test.test", password="adminpass", client=None):
        result = (client or self.client).post("/auth/login", json={"email": email, "password": password})
        self.assertEqual(result.status_code, 200, result.get_data(as_text=True))

    def test_recovery_end_to_end(self):
        unknown = self.client.post("/auth/recovery-request", json={"email": "unknown@test.test"})
        known = self.client.post("/auth/recovery-request", json={"email": " STUDENT0@test.test "})
        duplicate = self.client.post("/auth/recovery-request", json={"email": self.students[0].email})
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(known.status_code, 200)
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(unknown.json, known.json)
        self.assertEqual(known.json, duplicate.json)
        self.assertEqual(RecoveryRequest.query.count(), 1)
        rid = RecoveryRequest.query.one().id
        self.assertEqual(self.client.get("/admin/recovery-requests").status_code, 401)
        self.login(self.students[0].email, "originalpass")
        self.assertEqual(self.client.get("/admin/recovery-requests").status_code, 403)
        self.assertEqual(self.client.post(f"/admin/recovery-requests/{rid}/resolve").status_code, 403)
        self.login()
        queue = self.client.get("/admin/recovery-requests").json["requests"]
        self.assertEqual(len(queue), 1)
        self.assertEqual(set(queue[0]), {"id", "student_id", "student_name", "email", "created_at"})
        result = self.client.post(f"/admin/recovery-requests/{rid}/resolve")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.headers["Cache-Control"], "no-store")
        password = result.json["temp_password"]
        self.assertGreaterEqual(len(password), 20)
        self.assertEqual(self.client.get("/admin/recovery-requests").json, {"requests": []})
        self.assertEqual(self.client.post(f"/admin/recovery-requests/{rid}/resolve").status_code, 409)
        self.assertEqual(self.client.post("/auth/login", json={"email": self.students[0].email,
                                                              "password": "originalpass"}).status_code, 401)
        self.login(self.students[0].email, password)
        self.client.post("/auth/recovery-request", json={"email": self.students[0].email})
        self.assertEqual(RecoveryRequest.query.filter_by(resolved_at=None).count(), 1)
        self.assertEqual(RecoveryRequest.query.count(), 2)


    @staticmethod
    def pdf(encrypted=False):
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        if encrypted:
            writer.encrypt("secret")
        buf = io.BytesIO()
        writer.write(buf)
        return buf.getvalue()

    def upload(self, content=None, filename="resume.pdf"):
        return self.client.post("/portal/resume", data={
            "file": (io.BytesIO(self.pdf() if content is None else content), filename)})

    def seed_drives(self):
        company = Company(name="Acme", industry="Software")
        other = Company(name="Other", industry="Hardware")
        db.session.add_all([company, other])
        db.session.flush()
        drives = [Drive(company_id=company.id, title="Graduate", role="Engineer", package_lpa=10),
                  Drive(company_id=other.id, title="Closed", role="Analyst", package_lpa=6, is_active=False)]
        db.session.add_all(drives)
        db.session.flush()
        apps = [Application(student_id=s.id, drive_id=d.id)
                for s in self.students for d in drives]
        db.session.add_all(apps)
        db.session.commit()
        return drives, apps

    def test_csv_import_credentials_and_logout(self):
        self.login()
        result = self.client.post("/admin/students/import", data={"file": (io.BytesIO(
            b"roll_no,name,email,department,phone\n0012,Imported,new@test.test,CSE,0123456\n"
            b"0012,Duplicate,duplicate@test.test,ECE,999\n"), "students.csv")})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json["created"], 1)
        self.assertEqual(len(result.json["skipped"]), 1)
        credentials = result.json["temp_passwords"][0]
        student = Student.query.filter_by(email="new@test.test").one()
        self.assertEqual(student.roll_no, "0012")
        self.assertEqual(student.phone, "0123456")
        self.login(credentials["email"], credentials["temp_password"])
        self.assertEqual(self.client.get("/portal/summary").status_code, 200)
        self.assertEqual(self.client.post("/auth/logout").status_code, 200)
        self.assertEqual(self.client.get("/auth/me").status_code, 401)
        self.assertEqual(self.client.get("/portal/resume/download").status_code, 401)
        self.assertEqual(self.client.get("/admin/export/students").status_code, 401)

    def test_resume_valid_replace_metadata_access_and_delete(self):
        self.assertEqual(self.upload().status_code, 401)
        # Upload student 1 first: resume primary key is NOT the student ID.
        self.login(self.students[1].email, "originalpass")
        self.assertEqual(self.client.get("/portal/resume").json, {"resume": None})
        content = self.pdf()
        result = self.upload(content, "../../private resume.pdf")
        self.assertEqual(result.status_code, 201)
        meta = result.json["resume"]
        self.assertEqual(set(meta), {"filename", "size", "updated_at"})
        self.assertEqual(meta["size"], len(content))
        self.assertNotIn("/", meta["filename"])
        self.assertEqual(self.client.get("/portal/summary").json["profile"]["resume"], meta)
        self.assertEqual(self.client.patch("/portal/profile", json={}).json["profile"]["resume"], meta)
        download = self.client.get("/portal/resume/download")
        self.assertEqual(download.data, content)
        self.assertEqual(download.headers["Cache-Control"], "no-store")
        self.assertEqual(download.headers["X-Content-Type-Options"], "nosniff")
        self.assertIn("attachment;", download.headers["Content-Disposition"])
        self.assertEqual(self.upload(filename="replacement.pdf").status_code, 201)
        self.assertEqual(StudentResume.query.count(), 1)
        self.login(self.students[0].email, "originalpass")
        self.assertEqual(self.client.get("/portal/resume").json, {"resume": None})
        self.assertEqual(self.client.get("/portal/resume/download").status_code, 404)
        self.assertEqual(self.client.get(f"/admin/students/{self.students[1].id}/resume").status_code, 403)
        self.login()
        self.assertEqual(self.upload().status_code, 403)
        detail = self.client.get(f"/admin/students/{self.students[1].id}").json
        self.assertEqual(detail["student"]["resume"]["filename"], "replacement.pdf")
        download = self.client.get(f"/admin/students/{self.students[1].id}/resume")
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.headers["Cache-Control"], "no-store")
        self.assertEqual(download.headers["X-Content-Type-Options"], "nosniff")
        self.login(self.students[1].email, "originalpass")
        self.assertEqual(self.client.delete("/portal/resume").json, {"resume": None})
        self.assertEqual(self.client.delete("/portal/resume").status_code, 200)
        self.assertEqual(self.client.get("/portal/resume/download").status_code, 404)

    def test_resume_reject_invalid_without_overwriting(self):
        self.login(self.students[0].email, "originalpass")
        self.assertEqual(self.upload().status_code, 201)
        original = self.client.get("/portal/resume").json
        for content, filename, code in [(b"", "empty.pdf", 400),
                                        (b"not a pdf", "fake.pdf", 400),
                                        (b"%PDF-1.7\nbroken", "broken.pdf", 400),
                                        (self.pdf(), "wrong.txt", 400),
                                        (self.pdf(True), "encrypted.pdf", 400),
                                        (b"x" * (2097152 + 1), "large.pdf", 413)]:
            with self.subTest(filename=filename):
                self.assertEqual(self.upload(content, filename).status_code, code)
                self.assertEqual(self.client.get("/portal/resume").json, original)
        self.assertEqual(self.client.post("/portal/resume").status_code, 400)

    def test_resume_upload_limits(self):
        self.login(self.students[0].email, "originalpass")
        oversize = b"x" * (MAX_RESUME_BYTES + 128 * 1024)
        huge = self.client.post("/portal/resume", data={"file": (io.BytesIO(oversize), "big.pdf")})
        self.assertEqual(huge.status_code, 413)
        self.assertIsNone(StudentResume.query.filter_by(student_id=self.students[0].id).first())
        long_name = "r" * 300 + ".pdf"
        self.assertEqual(self.upload(filename=long_name).status_code, 400)
        self.assertIsNone(StudentResume.query.filter_by(student_id=self.students[0].id).first())
        self.assertEqual(self.upload(filename="r" * 250 + ".pdf").status_code, 201)

    def test_offers_scoped_and_note_validation(self):
        drives, apps = self.seed_drives()
        self.login()
        aid = apps[0].id
        for note in ["x" * 2001, 22, ["note"]]:
            self.assertEqual(self.client.post(f"/admin/applications/{aid}/status",
                json={"status": "selected", "note": note}).status_code, 400)
        self.assertEqual(PlacementRecord.query.count(), 0)
        self.assertEqual(ApplicationStatusHistory.query.count(), 0)
        self.assertEqual(self.client.post(f"/admin/applications/{aid}/status",
            json={"status": "selected", "note": "x" * 2000}).status_code, 200)
        record = PlacementRecord.query.one()
        record.package_lpa = 12.5
        db.session.commit()
        self.login(self.students[0].email, "originalpass")
        rows = {r["drive_id"]: r for r in self.client.get("/portal/applications").json["applications"]}
        self.assertEqual(rows[drives[0].id]["offer"], {
            "package_lpa": 12.5, "offered_on": record.offered_on.isoformat()})
        self.assertIsNone(rows[drives[1].id]["offer"])
        self.assertEqual(self.client.get("/portal/drives").status_code, 200)
        self.login(self.students[1].email, "originalpass")
        self.assertTrue(all(r["offer"] is None for r in self.client.get("/portal/applications").json["applications"]))
        self.login()
        self.client.post(f"/admin/applications/{aid}/status", json={"status": "rejected"})
        self.assertEqual(PlacementRecord.query.count(), 0)

    def test_applications_use_batched_queries(self):
        drives, apps = self.seed_drives()
        self.login(self.students[0].email, "originalpass")
        db.session.expire_all()
        from sqlalchemy import event
        statements = []

        def capture(conn, cursor, statement, parameters, context, executemany):
            if statement.lstrip().upper().startswith("SELECT"):
                statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", capture)
        try:
            response = self.client.get("/portal/applications")
        finally:
            event.remove(db.engine, "before_cursor_execute", capture)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json["applications"]), 2)
        # Session user (auth freshness), student, applications joined to
        # drive/company, offers, and history.
        self.assertEqual(len(statements), 5, statements)
        self.assertEqual(sum("FROM users" in sql for sql in statements), 1)
        self.assertEqual(sum("FROM placement_records" in sql for sql in statements), 1)

    def test_exports_match_lists_and_keep_empty_headers(self):
        drives, apps = self.seed_drives()
        self.login()
        cases = {"students": [{"q": "Student 0"}, {"dept": "ECE"}, {"program": "missing"},
                               {"status": "unplaced", "dept": "CSE", "program": "B.Tech"}],
                 "companies": [{"q": "Acme"}],
                 "drives": [{"q": "Acme"}, {"company": str(drives[1].company_id)},
                            {"status": "active"}, {"status": "closed", "company": str(drives[0].company_id)}],
                 "applications": [{"q": "Student 0"}, {"q": "Acme", "status": "applied"},
                                  {"status": "selected"}]}
        from app.routes.admin import EXPORTERS
        for entity, filters in cases.items():
            for params in filters + [{"q": "no matches here"}]:
                with self.subTest(entity=entity, params=params):
                    listed = self.client.get(f"/admin/{entity}", query_string=params).json[entity]
                    response = self.client.get(f"/admin/export/{entity}", query_string=params)
                    self.assertEqual(response.status_code, 200)
                    reader = csv.DictReader(io.StringIO(response.data.decode("utf-8-sig")))
                    exported = list(reader)
                    self.assertEqual(reader.fieldnames, EXPORTERS[entity]["columns"])
                    key = "roll_no" if entity == "students" else "name" if entity == "companies" else "id"
                    self.assertEqual([r[key] for r in exported], [str(r[key]) for r in listed])
        for path in ["/admin/drives", "/admin/export/drives"]:
            self.assertEqual(self.client.get(path, query_string={"company": "invalid"}).status_code, 400)

    def test_exports_sanitize_all_text_fields(self):
        drives, apps = self.seed_drives()
        self.students[0].roll_no = "=ROLL"
        self.students[0].department = "@DEPT"
        self.students[0].phone = "+PHONE"
        self.students[0].skills = "  =SKILL"
        drives[0].eligible_departments = "\t=DEPTS"
        drives[0].company.industry = "-INDUSTRY"
        db.session.commit()
        self.login()
        expected = {"students": {"roll_no": "'=ROLL", "department": "'@DEPT", "phone": "'+PHONE", "skills": "'=SKILL"},
                    "companies": {"industry": "'-INDUSTRY"},
                    "drives": {"eligible_departments": "'\t=DEPTS"},
                    "applications": {"roll_no": "'=ROLL", "department": "'@DEPT"}}
        for entity, cells in expected.items():
            response = self.client.get(f"/admin/export/{entity}")
            rows = list(csv.DictReader(io.StringIO(response.data.decode("utf-8-sig"))))
            for key, value in cells.items():
                self.assertTrue(any(row[key] == value for row in rows), (entity, key, rows))

    def test_student_cascade_with_foreign_keys(self):
        drives, apps = self.seed_drives()
        self.login(self.students[0].email, "originalpass")
        self.upload()
        self.client.post("/auth/recovery-request", json={"email": self.students[0].email})
        self.login()
        self.client.post(f"/admin/applications/{apps[0].id}/status", json={"status": "selected"})
        sid, uid = self.students[0].id, self.students[0].user_id
        self.assertEqual(self.client.delete(f"/admin/students/{sid}").status_code, 200)
        self.assertIsNone(db.session.get(Student, sid))
        self.assertIsNone(db.session.get(User, uid))
        self.assertEqual(StudentResume.query.count(), 0)
        self.assertEqual(RecoveryRequest.query.count(), 0)
        self.assertEqual(PlacementRecord.query.count(), 0)
        self.assertEqual(Application.query.filter_by(student_id=sid).count(), 0)
        self.assertEqual(ApplicationStatusHistory.query.count(), 0)

    def test_drives_list_tolerates_null_drive_date(self):
        """Regression: sorting mixed date/None used to raise TypeError (500)."""
        self.login()
        company = Company(name="Acme", industry="Software")
        db.session.add(company)
        db.session.flush()
        dated = Drive(company_id=company.id, title="Dated", role="Engineer",
                      drive_date=date(2027, 1, 1))
        undated = Drive(company_id=company.id, title="Undated", role="Analyst")  # no drive_date
        db.session.add_all([dated, undated])
        db.session.commit()

        response = self.client.get("/admin/drives")
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        titles = [d["title"] for d in response.json["drives"]]
        self.assertEqual(titles, ["Dated", "Undated"])  # dated first, nulls last

        export = self.client.get("/admin/export/drives")
        self.assertEqual(export.status_code, 200, export.get_data(as_text=True))

    def test_session_reflects_admin_edits_without_relogin(self):
        """Regression: name/role were snapshotted at login and went stale."""
        student_client = self.app.test_client()
        self.login(self.students[0].email, "originalpass", client=student_client)
        self.assertEqual(student_client.get("/auth/me").json["user"]["name"], "Student 0")

        self.login()  # admin renames the student
        result = self.client.put(f"/admin/students/{self.students[0].id}",
                                 json={"name": "Renamed Student"})
        self.assertEqual(result.status_code, 200)

        # The already-logged-in student sees the new name on the next request.
        self.assertEqual(student_client.get("/auth/me").json["user"]["name"], "Renamed Student")

    def test_deleted_user_session_is_revoked(self):
        """A deleted account's session must stop authorizing immediately."""
        student_client = self.app.test_client()
        self.login(self.students[0].email, "originalpass", client=student_client)
        self.assertEqual(student_client.get("/portal/summary").status_code, 200)

        self.login()  # admin deletes the student (and its login)
        self.client.delete(f"/admin/students/{self.students[0].id}")

        self.assertEqual(student_client.get("/portal/summary").status_code, 401)
        self.assertEqual(student_client.get("/auth/me").status_code, 401)

    def test_login_rate_limit(self):
        for _ in range(10):
            self.assertEqual(self.client.post("/auth/login", json={
                "email": "admin@test.test", "password": "wrong"}).status_code, 401)
        self.assertEqual(self.client.post("/auth/login", json={
            "email": "admin@test.test", "password": "adminpass"}).status_code, 429)

    def test_recovery_rate_limit(self):
        for _ in range(5):
            self.assertEqual(self.client.post("/auth/recovery-request", json={
                "email": "student0@test.test"}).status_code, 200)
        self.assertEqual(self.client.post("/auth/recovery-request", json={
            "email": "student0@test.test"}).status_code, 429)


if __name__ == "__main__":
    unittest.main()
