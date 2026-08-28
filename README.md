# PlaceMate — Placement Cell Management System

A full-stack placement management dashboard: **Flask + PostgreSQL** JSON API with a
**React (Vite) + Tailwind CSS 4 + Recharts** frontend, styled after a dark,
motion-forward aesthetic.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Recharts |
| Backend | Python 3 / Flask 3, Flask-SQLAlchemy, Flask-CORS |
| Database | PostgreSQL (`placement_db`) via psycopg |
| Analytics | Pandas (department statistics aggregation) |

## Project layout

```
├── run.py                  # Flask entrypoint (port 5001)
├── seed.py                 # Demo data seeder
├── migrate.py              # ALTER + login backfill for existing DBs
├── requirements.txt
├── app/
│   ├── __init__.py         # App factory + admin seeding
│   ├── extensions.py       # SQLAlchemy instance
│   ├── models.py           # User, Student, Company, Drive, Application, Notice
│   └── routes/
│       ├── auth.py         # /api/auth — login/logout/me/password
│       ├── admin.py        # /api/admin — dashboard stats + CRUD + export/import + notices
│       └── student.py      # /api/portal — student portal (drives, apply, profile)
└── frontend/
    ├── vite.config.js      # Dev proxy: /api → localhost:5001
    └── src/
        ├── api.js          # Fetch wrapper for all endpoints
        ├── components/     # Layout (role-aware rail), UI primitives
        └── pages/          # Admin + portal pages
```

## Running locally

```bash
# 1. Database (first time)
brew services start postgresql@14   # or postgresql@16 / postgres.app
createdb placement_db               # or: psql -c "CREATE DATABASE placement_db;"
# Optional override (default is postgres@localhost:5432/placement_db):
# export DATABASE_URL="postgresql+psycopg://USER:PASS@localhost:5432/placement_db"

# 2. Backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python seed.py        # optional demo data (+ creates tables)
./venv/bin/python migrate.py     # ONLY if you seeded before this feature expansion:
                                 #  adds drives.application_deadline, stamps deadlines,
                                 #  backfills a login User per student, seeds notices
./venv/bin/python run.py         # → http://localhost:5001

# 3. Frontend
cd frontend && npm install && npm run dev   # → http://localhost:5173
```

For hosted Postgres (Neon, Railway, Supabase, Vercel Marketplace), set
`DATABASE_URL` to the provider connection string. `postgres://` URLs are
accepted and normalized to `postgresql://` for SQLAlchemy.

## Logins

- **Admin:** `admin@placemate.edu` / `admin123` (auto-seeded on first backend start).
- **Student:** each student profile gets a login in `migrate.py` — email = the
  student's email, **default password = their roll number (lowercased)**, e.g. `22ece001`.
  Students log in to `/portal` and can edit their phone/skills and change their own password.
  Any student created/imported from the admin UI is auto-provisioned the same way.

## Roles & routing

- **Admin** (`/api/admin`) — full dashboard, student/company/drive CRUD, application
  status updates, CSV export/import, notices board.
- **Student** (`/api/portal`) — browse open drives with live eligibility, apply to
  eligible drives, track their own applications, update profile, read notices,
  change password. The frontend role-guards every route against the wrong role.

## API overview

### Admin (`/api/admin`, role = admin)
- `GET /dashboard` — KPIs (incl. `highest_package`, `avg_package_overall`, `unplaced`), top skills, dept stats, chart datasets
- `GET/POST /students`, `PUT/DELETE /students/:id`, `POST /students/:id/reset-password`, `POST /students/import`
- `GET/POST /companies`, `PUT/DELETE /companies/:id`
- `GET/POST /drives`, `PUT/DELETE /drives/:id`, `POST /drives/:id/toggle`, `GET /drives/:id/targets`
- `GET /applications`, `GET /applications/:id`, `POST /applications/:id/status`
- `GET/POST /notices`, `DELETE /notices/:id`
- `GET /export/:entity` for `students|companies|drives|applications` (CSV download)

All list endpoints accept filters: `?q=`, and status/department/company as applicable.

### Portal (`/api/portal`, role = student)
- `GET /summary` — profile, application counts, upcoming deadlines, latest notices
- `GET /drives` — every drive with per-student `eligible` / `ineligible_reason` / `applied`
- `POST /drives/:id/apply` — blocks ineligible, closed, deadline-passed, or duplicate applications
- `GET /applications` — the student&#39;s own applications with status
- `PATCH /profile` — update phone + skills
- `GET /notices` — notices visible to students

### Auth (`/api/auth`)
- `POST /login`, `POST /logout`, `GET /me`, `POST /password` (change own password)

## Eligibility engine

Every drive carries an optional `application_deadline` **and** an `eligible_programs`
list (currently `B.Tech` only). A student is **eligible** to apply when: the drive is active
AND their program is accepted AND they're in an eligible department AND their CGPA
meets the minimum AND the application deadline hasn't passed. The drive's `is_accepting`
derives the same way. Eligibility is enforced on the server at apply-time and surfaced
to both roles (admin sees an "Ineligible" badge + reason on applications; students see
why a drive isn't open to them).

## Programs

Students carry a `program`. B.Tech is the only program offered — the field is kept so
additional programs can be added later without a schema change. The Students page has a
program filter and the program shows under the department in the table. Drives show green
program chips on cards and detail pages, and the create/edit form accepts eligible
programs. CSV import/export includes the `program` column.

## Dashboard metrics

Total students · Total companies · Active drives · Applications · Shortlisted ·
Selected · Placement % (with meter) · Highest & average package · Skill demand
(horizontal bars) · Department statistics (table + placement-rate and avg-package
charts), plus applications-over-time trend and application funnel.

## CSV import format (`POST /api/admin/students/import`)

Required columns: `roll_no, name, email, department`. Optional: `phone, cgpa,
graduation_year, skills`. Rows with missing/duplicate roll-no or email are skipped and
reported back as `{created, skipped:[{row, error}]}`. A template is downloadable from
the Students page.
