# Student features and placement-cell controls

## Password recovery

Choose **Forgot password?** on the login page and submit the student's registered email. The response is deliberately generic and does not disclose whether an account exists. Eligible student accounts create one pending request in the placement cell's **Students → Password recovery** queue.

An administrator must verify the student's identity through the institution's established process before resolving the request. Resolving issues a new temporary password, displayed in memory for secure handover. No email provider, email OTP, or automatic email delivery is configured. Temporary passwords do not expire automatically and students should change them after signing in. This does not revoke previously copied signed session cookies; broader session revocation and rate limiting remain separate hardening work.

## Private resumes

Students can upload, replace, download, and remove a PDF from **Profile**. Files must be readable, unencrypted PDFs, no larger than **2 MiB**. Invalid replacements leave the prior resume intact. Administrators can download resumes from **Student detail**.

PDF bytes are held in PostgreSQL in `student_resumes`, not a public URL or the serverless filesystem. Binary content is deferred when reading metadata. Downloads require the owning student's session or an admin session and are attachments with `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. PDF parsing validates format, not malware safety; institutions should still use endpoint protection when opening downloaded files. Account deletion removes the stored resume.

## Calendar

The student **Calendar** tab displays drive dates and application deadlines as separate events in a Monday-first month grid. Previous/next month and Today controls support browsing. Events open the existing drive detail page; they do not create or edit drives. Dates use local calendar components, avoiding UTC day shifts. Closed/ineligible drives remain visible for reference.

## Placement-cell quick wins

- CSV import displays generated credentials in a dismissible in-memory panel, with an explicit sensitive-data warning and CSV download. Downloaded credentials must be handled securely; they are not stored in browser local storage.
- Logout now calls the server before clearing client authentication. A failed call leaves the UI signed in with an error rather than falsely claiming logout.
- Students see actual recorded offer CTC separately from advertised drive CTC.
- Application status forms support optional notes up to 2,000 characters.
- Drive deletion requires confirmation and warns that linked applications/history/offers will be removed.
- CSV exports reuse the list endpoint's filters and export the last successfully displayed filter selection. Empty results still contain column headers.

## Deployment

Install updated Python requirements (`pypdf` was added) and deploy backend and frontend together. The existing app startup `db.create_all()` creates the two new tables, `recovery_requests` and `student_resumes`; no existing column alteration or legacy data backfill is needed. Do **not** run the legacy `migrate.py` just for this release. The DB role must be allowed to create the new tables and indexes.

No email credentials or object-storage keys are required. Resume storage increases database size and backup volume. The two new tables were applied to Neon on 17 September 2026 using a targeted transaction; existing row counts were unchanged. Application deployment must include the updated Python requirements.

## Verification

```sh
venv/bin/python -m unittest discover -s tests -p 'test*.py' -v
node --test frontend/tests/*.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
```

Backend tests construct an isolated SQLite app and enable foreign keys without invoking the production factory or loading `.env`. They cover recovery, permissions, upload validation/replacement, CSV credentials, filtering and headers, notes/offers, logout, and cascade cleanup. PostgreSQL deployment behavior still requires its normal staging check.

For an optional isolated browser fixture, run `venv/bin/python tests/browser_fixture.py` and `VITE_API_URL=http://127.0.0.1:5087 npm --prefix frontend run dev -- --host 127.0.0.1 --port 5187 --strictPort`. Its database is memory-only and contains deliberately synthetic credentials defined in that test fixture; it must never be deployed as the application entry point.
