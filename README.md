# PlaceMate — Placement Cell Management System

A full-stack placement management dashboard: **Flask + PostgreSQL** JSON API with a
**React (Vite) + Tailwind CSS 4 + Recharts** frontend, styled after a dark,
motion-forward aesthetic.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Recharts |
| Backend | Python 3 / Flask 3, Flask-SQLAlchemy, Flask-CORS |
| Database | PostgreSQL (`placement_db`) via psycopg (SQLite in-memory for tests / isolated demo fixture) |
| Analytics | Pandas (department statistics aggregation + student CSV import; numpy comes transitively with pandas) |
| Resumes | pypdf (PDF validation for student resume upload, 2 MB limit) |

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

Login uses an **email address as the username**. Copy-paste credentials:

| Role | Username / email | Password | Notes |
|---|---|---|---|
| Admin | `admin@placemate.edu` | `ADMIN_PASSWORD` if set, otherwise `admin123` | Normal local app (`./venv/bin/python run.py`); seeded on first backend start |
| Student | student email (e.g. from `seed.py` output) | One-time temp password shown at creation/reset | No fixed shared password; see below |
| Admin (isolated demo) | `browser@admin.test` | `local-admin-test` | Created by `tests/browser_fixture.py` only |
| Student (isolated demo) | `browser@student.test` | `local-browser-test` | Created by `tests/browser_fixture.py` only |

### Local testing accounts (isolated demo only)

These accounts are created by
`tests/browser_fixture.py`, not by the normal application or production seed.

Start the API and frontend in separate terminals from the repository root:

```bash
# Terminal 1 — isolated Flask API on port 5087
./venv/bin/python tests/browser_fixture.py

# Terminal 2 — frontend on port 5187, using that API
VITE_API_URL=http://127.0.0.1:5087 npm --prefix frontend run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

Open **http://127.0.0.1:5187/login**. Port **5187 serves the frontend**;
port **5087 serves the Flask API**. The fixture uses an in-memory SQLite database
with synthetic records: changes disappear when its API process stops. These
published passwords are for this local fixture only; never deploy the fixture
or reuse them for real accounts.

### Normal application accounts

- **Admin:** `admin@placemate.edu`. The initial password is `ADMIN_PASSWORD` if
  configured, otherwise the development fallback is `admin123`. This does not
  override an existing account's password and is not a verified production login.
- **Student:** accounts are provisioned when students are added or CSV-imported.
  The username is the student's email. The generated temporary password is shown
  on creation/reset, or in the CSV import credentials panel. Students should
  change it after signing in. There is no fixed shared student password.

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
- `GET /students/:id` — student detail: profile, applications + placement offers
- `PUT /students/:id/offers/:rid` — set the actual offered CTC (`package_lpa`) on an offer
- `GET/POST /companies`, `PUT/DELETE /companies/:id`
- `GET/POST /drives`, `PUT/DELETE /drives/:id`, `POST /drives/:id/toggle`, `GET /drives/:id/targets`
- `GET /applications`, `GET /applications/:id`, `POST /applications/:id/status`
- `GET/POST /notices`, `DELETE /notices/:id`
- `GET /export/:entity` for `students|companies|drives|applications` (CSV download)

All list endpoints accept filters: `?q=`, and status/department/company as applicable.

### Portal (`/api/portal`, role = student)
- `GET /summary` — profile, application counts, upcoming deadlines, latest notices
- `GET /drives` — every drive with per-student `eligible` / `ineligible_reason` / `applied`
- `GET /drives/:id` — one drive with the student's eligibility + application state
- `POST /drives/:id/apply` — blocks ineligible, closed, deadline-passed, or duplicate applications
- `GET /applications` — the student&#39;s own applications with status
- `PATCH /profile` — update phone + skills
- `GET /notices` — notices visible to students

### Auth (`/api/auth`)
- `POST /login`, `POST /logout`, `GET /me`, `POST /password` (change own password)

### Offers, rounds & policy

- Every status change is recorded in an audit/status-history timeline — visible
  on the admin application detail page and as status chips in the student's
  applications list.
- Marking an application **Selected** automatically creates a PlacementRecord
  (offer); the admin can override its actual CTC via
  `PUT /students/:id/offers/:rid`.
- A placed student can only apply to drives paying at least their best offer
  + 2 LPA (the "offer ladder") — enforced server-side at apply time.
- Dashboard highest/average package figures use actual offers when present,
  falling back to the advertised drive package.

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

## Pandas usage (all in `app/routes/admin.py`, `import pandas as pd` at line 8)

Pandas is used in 3 places. `numpy` is never imported directly — it ships
transitively with `pandas==2.3.3` for the numeric backend (`mean`, `NaN`).

### 1. Department statistics — `GET /api/admin/dashboard` (lines 228-247)
Table used: `students` (`Student`: `department`, `status`, `cgpa`).

```python
df = pd.DataFrame(
    [{"department": s.department, "status": s.status, "cgpa": s.cgpa} for s in students]
)
grouped = df.groupby("department").agg(total=("status", "size"), avg_cgpa=("cgpa", "mean"))
placed = df[df["status"] == "selected"].groupby("department").size().rename("selected")
grouped = grouped.join(placed).fillna({"selected": 0})
grouped["pct"] = (grouped["selected"] / grouped["total"] * 100).round(1)
```
Per-department `total` + `avg_cgpa`, joined with the `selected` count to get
placement `%`. Feeds `dept_stats` and the `deptPlacement` chart.

### 2. Student CSV import — `POST /api/admin/students/import` (lines 533-549)
Tables written: `students` (`Student`) + `users` (`User` login per student).

```python
df = pd.read_csv(io.StringIO(text), dtype=str)  # dtype=str keeps phone/roll-no as strings
...
for i, row in df.iterrows():
    record = {str(c).strip(): ("" if v is None or (isinstance(v, float) and pd.isna(v)) else v)
              for c, v in row.items()}
```
`read_csv` parses the upload; `pd.isna(v)` normalizes empty cells before each
row creates a `Student` (+ `User` via `_ensure_student_user`).

### 3. CSV export — `GET /api/admin/export/:entity` (lines 1065-1078)
Tables read per entity: `students` → `students`; `companies` (+ drive counts) →
`companies`; `drives` (+ `companies`) → `drives`; `applications` (+ `students`,
`drives`, `companies`) → `applications`.

```python
def _export_frame(entity):
    return pd.DataFrame(
        [{key: _csv_safe(value) for key, value in row.items()}
         for row in _export_rows(entity)], columns=EXPORTERS[entity]["columns"])

df = _export_frame(entity)
df.to_csv(buf, index=False)
```
Rows are built from the ORM, loaded into a `DataFrame` (fixed column order +
formula-injection-safe cells), then streamed out with `to_csv`.

## CSV import format (`POST /api/admin/students/import`)

Required columns: `roll_no, name, email, department`. Optional: `phone, cgpa,
graduation_year, skills`. Rows with missing/duplicate roll-no or email are skipped and
reported back as `{created, skipped:[{row, error}]}`. A template is downloadable from
the Students page.

## Security & deployment notes

- **`SECRET_KEY` is required in production.** The backend refuses to start
  without it when `VERCEL`/`FRONTEND_ORIGIN` is set (dev fallback only works
  locally). Sessions are signed with it; a predictable key makes them forgeable.
- **Set `ADMIN_PASSWORD` before the first backend start.** The first-run seed
  creates `admin@placemate.edu`; with no `ADMIN_PASSWORD` it falls back to
  `admin123` and logs a warning. Change the password after first login either way.
- **Student logins get random one-time temp passwords.** Creating a student
  (form or CSV import) and `POST /students/:id/reset-password` return a random
  `temp_password`/`temp_passwords` exactly once — hand it to the student and have
  them change it via `/api/auth/password` after first login. Passwords are never
  derived from roll numbers.
- **Deleting is cascading:** a student delete removes their applications and
  login; a company delete removes its drives and their applications; a drive
  delete (`DELETE /api/admin/drives/:id`) removes its applications. These are
  destructive — the UI should confirm.
- **CSV exports** neutralize leading `= + - @` cells so pasted formulas can't
  execute in Excel/Sheets.
- Required env vars in production: `DATABASE_URL`, `SECRET_KEY`,
  `FRONTEND_ORIGIN` (exact UI origin for credentialed CORS cookies),
  `ADMIN_PASSWORD` (first boot only).

## API additions

- `DELETE /api/admin/drives/:id` — delete a drive and its applications.
- `POST /api/admin/students/import` response now includes
  `temp_passwords: [{email, temp_password}]` for every provisioned login.
- Duplicate/conflicting writes return `409` with a friendly message instead of
  leaking raw DB errors; invalid program values are rejected with `400`.
