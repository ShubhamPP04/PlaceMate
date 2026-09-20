# PlaceMate — Data Analytics & SQLAlchemy, Explained Simply

This doc explains, in plain language with real code from this repo,
**what analytics the app does, where pandas is used (with the tables involved),
and what SQLAlchemy is and why the app uses it.**

## Part 1 — What "data analytics" means in PlaceMate

The placement cell wants answers like:

- How many students are placed? (placement %)
- Which department performs best?
- What is the highest / average package?
- Which skills are in demand?
- How are applications trending month by month?

All of that is computed live in one endpoint:
`GET /api/admin/dashboard` → `dashboard()` in `app/routes/admin.py:169`.
It reads the database, crunches numbers, and returns JSON the React
dashboard turns into KPI cards, tables and Recharts charts.

## Part 2 — Where pandas is used (all 3 places)

`import pandas as pd` lives in exactly one file: `app/routes/admin.py:8`.
`numpy` is never imported directly — it ships automatically with pandas
and powers pandas' math (`mean`, `NaN`) behind the scenes.

### Use 1 — Department statistics (dashboard)

**File:** `app/routes/admin.py:228-247`
**Table used:** `students` — columns `department`, `status`, `cgpa`
(Model: `Student` in `app/models.py`.)

```python
df = pd.DataFrame(
    [{"department": s.department, "status": s.status, "cgpa": s.cgpa} for s in students]
)
grouped = df.groupby("department").agg(total=("status", "size"), avg_cgpa=("cgpa", "mean"))
placed = df[df["status"] == "selected"].groupby("department").size().rename("selected")
grouped = grouped.join(placed).fillna({"selected": 0})
grouped["pct"] = (grouped["selected"] / grouped["total"] * 100).round(1)
```

**In easy words:**

1. `pd.DataFrame(...)` — turns the list of students into a table
   (like a mini Excel sheet) with 3 columns.
2. `groupby("department")` — splits the table into one pile per
   department (CSE pile, ECE pile, …).
3. `.agg(total=..., avg_cgpa=...)` — per pile, counts students
   (`total`) and averages their CGPA (`avg_cgpa`).
4. The `placed` line filters only `selected` students and counts them
   per department.
5. `.join(...)` glues the two results together; departments with no
   placed students get `0` instead of a blank.
6. `pct` = placed ÷ total × 100, rounded to 1 decimal.

The result feeds `dept_stats` and the "Dept placement" chart on the dashboard.

### Use 2 — Student CSV import

**File:** `app/routes/admin.py:533-549`
**Tables written:** `students` (`Student`) + `users` (`User` login per student).

```python
df = pd.read_csv(io.StringIO(text), dtype=str)  # read the uploaded CSV
...
for i, row in df.iterrows():                    # loop over rows
    record = {str(c).strip(): ("" if v is None or (isinstance(v, float) and pd.isna(v)) else v)
              for c, v in row.items()}
```

**In easy words:**

1. `pd.read_csv(...)` — reads the uploaded CSV file into a table.
   `dtype=str` forces every column to stay text, so a phone number like
   `09876...` doesn't turn into a number and lose its leading zero.
2. `df.iterrows()` — walks the table one student-row at a time.
3. `pd.isna(v)` — converts empty cells into `""` so later code
   (`.strip()`, validation) never crashes on blanks.
4. Each clean row becomes a `Student` row, plus a `User` login row with a
   one-time temp password (via `_ensure_student_user`).

### Use 3 — CSV export

**File:** `app/routes/admin.py:1065-1078`
**Tables read (depends on what you export):**

| Export | Tables read |
|---|---|
| `students` | `students` |
| `companies` | `companies` (+ drive counts) |
| `drives` | `drives` (+ `companies`) |
| `applications` | `applications` (+ `students`, `drives`, `companies`) |

```python
def _export_frame(entity):
    return pd.DataFrame(
        [{key: _csv_safe(value) for key, value in row.items()}
         for row in _export_rows(entity)], columns=EXPORTERS[entity]["columns"])

df = _export_frame(entity)
df.to_csv(buf, index=False)
```

**In easy words:** rows are first built with normal Python code,
then put into a DataFrame to enforce a fixed column order and
formula-safe cells (`_csv_safe` neutralises `= + - @` so Excel can't
run pasted formulas), then `to_csv` streams the file to the browser.

## Part 3 — Analytics done without pandas

Not every number needs pandas. The same `dashboard()` function also uses:

- **Plain Python** (`app/routes/admin.py:181-186`):
  ```python
  total_students = len(students)
  selected = sum(1 for s in students if s.status == "selected")
  placement_pct = round(selected / total_students * 100, 1) if total_students else 0.0
  ```
  Simple counting — a full table library would be overkill.
- **`Counter`** (`app/routes/admin.py:221-226, 250-258`): counts skill
  occurrences for "Skill demand" and applications per month for the trend
  chart — like tally marks on paper.
- **SQL aggregate functions** (`db.func.max`, `db.func.count`): e.g.
  `app/models.py:233` finds the best offer package with
  `MAX(package_lpa)` — the database does the math before Python sees the data.

Rule of thumb used here: database functions for single numbers,
`Counter`/loops for simple tallies, pandas when you need
group-by-multiple-columns table math (dept stats) or CSV parsing/writing.

## Part 4 — SQLAlchemy, explained simply

### The one-line idea

**SQLAlchemy is a translator between Python objects and database tables.**
You write Python; it writes SQL for you.

Without it, every question to the database looks like this:

```python
cursor.execute("SELECT id, name, email FROM students WHERE department = 'CSE'")
rows = cursor.fetchall()   # raw tuples you map by hand
```

With it (real code from `app/routes/admin.py:172-174`):

```python
students = Student.query.all()
companies_count = Company.query.count()
```

`Student` is a normal Python class defined in `app/models.py`
(it maps to the `students` table; each attribute like `s.department`
is a column). No SQL strings, no manual row-mapping.

### The 4 jobs it does in this app

**1. Models = tables (`app/models.py`).**
Each class is a table, each attribute a column:

```python
class Student(db.Model):
    __tablename__ = "students"
    roll_no = db.Column(db.String(20), unique=True, nullable=False)
    department = db.Column(db.String(80), nullable=False, index=True)
    cgpa = db.Column(db.Float, nullable=False, default=0.0)
```

Tables here: `users`, `students`, `companies`, `drives`, `applications`,
`application_status_history`, `placement_records`, `recovery_requests`,
`student_resumes`. Rules like `unique=True` become real database
constraints, so duplicates are rejected even if two requests race.

**2. Session = shopping cart (`db.session`).**
You stage changes, then pay once with `commit()`:

```python
db.session.add(student)   # put in cart
db.session.commit()       # save everything together, or nothing
```

If anything fails midway, the whole cart is discarded — the database
never ends up half-updated. (Used in every create/update route,
e.g. `app/routes/admin.py:333-...`.)

**3. Queries = Python instead of SQL.**
```python
Student.query.filter(Student.department == "CSE").all()
db.session.query(db.func.max(PlacementRecord.package_lpa)).scalar()
```
Filters, counts, max, joins — all Python expressions that SQLAlchemy
compiles to SQL for whichever database is configured.

**4. Relationships = automatic joins.**
```python
a.drive.company.name     # application → its drive → its company
s.resume.metadata_dict() # student → their resume row
```
No hand-written `JOIN`s: `models.py` declares how tables link
(`ForeignKey` + `relationship`), and SQLAlchemy follows the links.
`joinedload` in `admin.py:176-179` pre-fetches them in one query
so dashboard loops don't spam the database (the "N+1" problem).

### Why it matters here: one code, three databases

The app talks to different databases in different places with **zero
code changes** — only the `DATABASE_URL` changes (`app/__init__.py:47-57`):

| Where | Database |
|---|---|
| Your laptop | PostgreSQL (`placement_db` via `psycopg`) |
| Vercel API (`placemate-api`) | Hosted Postgres (Neon) |
| Tests + isolated demo fixture | SQLite in-memory |

`db.create_all()` (`app/__init__.py:104`) creates any missing tables on
startup, and `_seed_admin` creates `admin@placemate.edu` on first boot.
That portability is exactly what you'd lose by replacing SQLAlchemy with
raw MySQL code: ~100+ queries across `app/routes/` would all become
hand-written SQL strings tied to one database.

### Postgres-specific bits (very few)

Almost everything is portable. The only Postgres-flavoured pieces:

- Driver + URL: `psycopg[binary]` (`requirements.txt`, `pyproject.toml`)
  and the `postgresql+psycopg://...` default in `app/__init__.py:47-56`.
- One partial unique index in `app/models.py:208-210`
  (`postgresql_where=...` — "at most one pending recovery request per
  student"; other databases just skip that clause).
- `.ilike(...)` search in `admin.py` (native on Postgres, emulated
  elsewhere by SQLAlchemy).
