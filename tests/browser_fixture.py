from datetime import date
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flask import Flask
from flask_cors import CORS
from app.extensions import db
from app.models import Student, User, Company, Drive
from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.student import portal_bp

app = Flask(__name__)
app.config.update(SECRET_KEY='isolated-browser-test-only', SQLALCHEMY_DATABASE_URI='sqlite:///:memory:')
db.init_app(app)
CORS(app, supports_credentials=True, origins=['http://127.0.0.1:5187'])
for bp, prefix in [(auth_bp, '/api/auth'), (admin_bp, '/api/admin'), (portal_bp, '/api/portal')]:
    app.register_blueprint(bp, url_prefix=prefix)
with app.app_context():
    db.create_all()
    admin = User(email='browser@admin.test', name='Browser Admin', role='admin')
    admin.set_password('local-admin-test')
    db.session.add(admin)
    user = User(email='browser@student.test', name='Browser Student', role='student')
    user.set_password('local-browser-test')
    db.session.add(user)
    db.session.flush()
    db.session.add(Student(user_id=user.id, email=user.email, name=user.name, roll_no='BROWSER1', program='B.Tech', department='CSE', cgpa=8, graduation_year=2027))
    company = Company(name='Calendar Test Company')
    db.session.add(company)
    db.session.flush()
    db.session.add(Drive(company_id=company.id, title='Calendar Test Drive', role='Developer', package_lpa=8, drive_date=date.today(), application_deadline=date.today(), eligible_departments='CSE', eligible_programs='B.Tech'))
    db.session.commit()
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5087, debug=False)
