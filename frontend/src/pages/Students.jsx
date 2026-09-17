import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Alert, Card, Field, GhostButton, PrimaryButton, StatusPill, inputClass } from '../components/ui'

const PROGRAMS = ['B.Tech']

const EMPTY = {
  roll_no: '', name: '', email: '', phone: '',
  program: 'B.Tech', department: '', cgpa: '', graduation_year: 2026, skills: '',
}

const toSkills = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

export default function Students() {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [programs, setPrograms] = useState(PROGRAMS)
  const [filters, setFilters] = useState({ q: '', dept: '', status: '', program: '' })
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null) // student id when editing
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [importReport, setImportReport] = useState(null)
  const [appliedFilters, setAppliedFilters] = useState({ q: '', dept: '', status: '', program: '' })
  const listRequest = useRef(0)
  const [credentials, setCredentials] = useState([])
  const [importing, setImporting] = useState(false)
  const [recoveryRequests, setRecoveryRequests] = useState([])
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [resolving, setResolving] = useState(null)
  const [recoveryCredential, setRecoveryCredential] = useState(null)
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(async (f = {}) => {
    const requestId = ++listRequest.current
    try {
      const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
      const data = await api.students(params ? `?${params}` : '')
      if (requestId !== listRequest.current) return
      setStudents(data.students)
      setDepartments(data.departments)
      setPrograms(data.programs?.length ? data.programs : PROGRAMS)
      setAppliedFilters({ ...f })
    } catch (err) {
      if (requestId === listRequest.current) setMessage({ kind: 'danger', text: err.message })
    }
  }, [])

  const loadRecovery = useCallback(async () => {
    setRecoveryLoading(true)
    setRecoveryError('')
    try {
      const data = await api.recoveryRequests()
      setRecoveryRequests(data.requests || [])
    } catch (err) {
      setRecoveryError(err.message)
    } finally {
      setRecoveryLoading(false)
    }
  }, [])

  useEffect(() => { load(); loadRecovery() }, [load, loadRecovery])

  async function resolveRecovery(request) {
    if (resolving !== null || !confirm(`Have you verified ${request.student_name}'s identity offline using trusted college records? Resolve the recovery request for ${request.email} and issue a temporary password only after verification.`)) return
    setResolving(request.id)
    setRecoveryError('')
    try {
      const { temp_password } = await api.resolveRecovery(request.id)
      setRecoveryCredential({ email: request.email, temp_password })
      setRecoveryRequests((rows) => rows.filter((row) => row.id !== request.id))
    } catch (err) {
      setRecoveryError(err.message)
    } finally {
      setResolving(null)
    }
  }

  function downloadCredentials() {
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [['email', 'temp_password'], ...credentials.map((row) => [row.email, row.temp_password])]
      .map((row) => row.map(quote).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'student-login-credentials.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function openCreate() {
    setEditing(null); setForm(EMPTY); setShowForm(true); setMessage(null)
  }
  function openEdit(s) {
    setEditing(s.id)
    setForm({ ...s, program: s.program || 'B.Tech', cgpa: s.cgpa, graduation_year: s.graduation_year, skills: (s.skills || []).join(', ') })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const body = { ...form, skills: toSkills(form.skills) }
      if (editing) {
        await api.updateStudent(editing, body)
        setMessage({ kind: 'success', text: 'Student updated.' })
      } else {
        const res = await api.addStudent(body)
        const pw = res.student?.temp_password
        setMessage({ kind: 'success', text: pw ? `Student added — one-time login password: ${pw}` : 'Student added.' })
      }
      setForm(EMPTY); setEditing(null); setShowForm(false)
      load(appliedFilters)
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Remove ${s.name}?`)) return
    try {
      await api.deleteStudent(s.id)
      setMessage({ kind: 'info', text: `${s.name} removed.` })
      load(appliedFilters)
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function handleReset(s) {
    if (!confirm(`Reset login password for ${s.name}?`)) return
    try {
      const { temp_password } = await api.resetStudentPassword(s.id)
      setMessage({ kind: 'info', text: `Password reset to ${temp_password}.` })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file || importing) return
    const fd = new FormData()
    fd.append('file', file)
    setImporting(true)
    try {
      const res = await api.importStudents(fd)
      setImportReport({ created: res.created, skipped: res.skipped })
      if (res.temp_passwords?.length) {
        setCredentials((rows) => [...rows, ...res.temp_passwords])
        setMessage({ kind: 'success', text: `Imported ${res.created} student(s) — download their one-time login passwords below. They are shown once.` })
      } else {
        setMessage({ kind: 'success', text: `Imported ${res.created} student(s).` })
      }
      load(appliedFilters)
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const TEMPLATE = 'roll_no,name,email,phone,program,department,cgpa,graduation_year,skills,status'
  // A one-option program filter is dead weight; it reappears if a second
  // program is ever added back.
  const multiProgram = programs.length > 1

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">{students.length} enrolled</p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Students</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={api.exportUrl('students', appliedFilters)} className="btn-ghost">Export CSV</a>
          <GhostButton disabled={importing} onClick={() => fileRef.current?.click()}>{importing ? 'Importing…' : 'Import CSV'}</GhostButton>
          <input ref={fileRef} type="file" accept=".csv" disabled={importing} className="hidden" onChange={handleImport} />
          {showForm
            ? <GhostButton onClick={() => { setShowForm(false); setEditing(null) }}>Close</GhostButton>
            : <PrimaryButton onClick={openCreate}>Add student</PrimaryButton>}
        </div>
      </div>

      <div className="rise flex items-center gap-3">
        <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="students-template.csv" className="whitespace-nowrap text-[11px] text-ink-low underline decoration-dotted underline-offset-2 hover:text-ink-hi">
          Download CSV template
        </a>
        <span className="text-[11px] text-ink-low">· include a <span className="text-ink-mid">program</span> column (B.Tech)</span>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {importReport?.skipped?.length > 0 && (
        <Alert kind="danger" onClose={() => setImportReport(null)}>
          {importReport.skipped.length} row(s) skipped — first: {importReport.skipped[0].error}
        </Alert>
      )}

      {/* One-time login passwords from imports — shown once, kept in
          memory only. Never logged, never sent anywhere except this download. */}
      {credentials.length > 0 && (
        <div className="rise arc-card border-amber-400/40">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-semibold text-ink-hi">
                  {credentials.length} one-time login password{credentials.length === 1 ? '' : 's'} — sensitive
                </p>
                <p className="mt-0.5 text-xs text-ink-mid">
                  Download the quoted CSV and share each student their password over a trusted channel. These stay in memory on this page only — leaving or dismissing clears them for good.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PrimaryButton onClick={downloadCredentials} className="!px-4 !py-2 !text-xs">Download CSV</PrimaryButton>
              <GhostButton onClick={() => setCredentials([])} className="!px-4 !py-2 !text-xs">Dismiss</GhostButton>
            </div>
          </div>
        </div>
      )}

      {/* Password recovery requests — verify identity offline before resolving */}
      <div className="rise">
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <div>
              <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Password recovery requests</h2>
              <p className="mt-1.5 text-[11px] text-ink-low">
                Verify the student&rsquo;s identity offline (in person or via trusted college records) before resolving. Resolving issues a one-time password.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <GhostButton onClick={loadRecovery} disabled={recoveryLoading || resolving !== null} className="!px-3.5 !py-1.5 !text-xs">{recoveryLoading ? 'Loading…' : 'Refresh'}</GhostButton>
            </div>
          </div>
          {recoveryError && <p className="px-5 pt-3 text-[12px] text-coral">{recoveryError}</p>}
          {recoveryCredential && (
            <div className="mx-5 mt-4 rounded-xl border border-amber-400/40 bg-raise p-3">
              <p className="break-words text-[12px] text-ink-mid">
                Sensitive — recovery resolved for <span className="font-semibold text-ink-hi">{recoveryCredential.email}</span> — one-time password: <span className="font-semibold tabular-nums text-ink-hi">{recoveryCredential.temp_password}</span>. Share it over a trusted channel; it won&rsquo;t be shown again.
              </p>
              <button type="button" onClick={() => setRecoveryCredential(null)} className="mt-1 text-[11px] text-ink-low underline decoration-dotted underline-offset-2 hover:text-ink-hi">Dismiss</button>
            </div>
          )}
          {recoveryRequests.length > 0 ? (
            <div className="px-5 pb-5 pt-3">
              <div className="space-y-2">
                {recoveryRequests.map((r) => (
                  <div key={r.id} className="flex flex-col gap-2.5 rounded-xl border border-hairline bg-raise p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink-hi">{r.student_name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-mid">{r.email}</p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-ink-low">Requested {r.created_at}</p>
                    </div>
                    <GhostButton
                      onClick={() => resolveRecovery(r)}
                      disabled={resolving !== null || recoveryLoading || recoveryCredential !== null}
                      className="shrink-0 !px-4 !py-2 !text-xs"
                    >
                      {resolving === r.id ? 'Resolving…' : 'Resolve'}
                    </GhostButton>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !recoveryError && !recoveryLoading && <p className="px-5 pb-5 pt-2 text-center text-sm text-ink-low">No pending recovery requests.</p>
          )}
        </Card>
      </div>

      {showForm && (
        <div className="rise">
          <Card className="p-0">
            <form onSubmit={handleSubmit} className="grid gap-4 p-5 md:grid-cols-4">
              <Field label="Roll No *"><input className={inputClass} value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} required /></Field>
              <Field label="Name *"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
              <Field label="Email *"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
              <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Program">
                <select className={inputClass} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
                  {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Department *"><input className={inputClass} placeholder="CSE" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></Field>
              <Field label="CGPA"><input type="number" step="0.01" min="0" max="10" className={inputClass} value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} /></Field>
              <Field label="Grad Year"><input type="number" className={inputClass} value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} /></Field>
              <Field label="Skills (comma-sep)"><input className={inputClass} placeholder="Python, SQL, React" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
              <div className="md:col-span-4">
                <PrimaryButton type="submit">{editing ? 'Save changes' : 'Save student'}</PrimaryButton>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="rise rise-d1">
        <Card className="p-0">
          <div className="p-5 pb-0">
            {/* filter row — scopes everything below */}
            <div className="mb-5 grid gap-2.5 md:grid-cols-12">
              <div className={`field-shell ${multiProgram ? 'md:col-span-4' : 'md:col-span-6'}`}>
                <input
                  className={inputClass}
                  placeholder="Search name or roll no…"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && load(filters)}
                />
              </div>
              {multiProgram && (
                <div className="field-shell md:col-span-2">
                  <select className={inputClass} value={filters.program} onChange={(e) => setFilters({ ...filters, program: e.target.value })}>
                    <option value="">All programs</option>
                    {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              <div className="field-shell md:col-span-2">
                <select className={inputClass} value={filters.dept} onChange={(e) => setFilters({ ...filters, dept: e.target.value })}>
                  <option value="">All depts</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field-shell md:col-span-2">
                <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All statuses</option>
                  {['unplaced', 'shortlisted', 'selected'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <GhostButton className="justify-self-start md:col-span-2 md:justify-self-stretch" onClick={() => load(filters)}>Apply</GhostButton>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="mobile-list flex md:hidden">
            {students.map((s) => (
              <div key={s.id} className="mobile-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" onClick={() => navigate(`/students/${s.id}`)} className="truncate text-left text-[15px] font-semibold text-ink-hi transition-colors hover:text-green">{s.name}</button>
                    <p className="mt-0.5 text-[12px] tabular-nums text-ink-mid">{s.roll_no}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-low">{s.email}</p>
                  </div>
                  <StatusPill status={s.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-mid">
                  <span>{multiProgram ? `${s.department} · ${s.program}` : s.department}</span>
                  <span className="tabular-nums">CGPA {s.cgpa.toFixed(2)}</span>
                  <span className="tabular-nums">Grad {s.graduation_year}</span>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => openEdit(s)} className="rounded-full border border-hairline px-3 py-1.5 text-[11px] text-ink-mid active:scale-[0.98]">Edit</button>
                  <button type="button" onClick={() => handleReset(s)} className="rounded-full border border-hairline px-3 py-1.5 text-[11px] text-ink-mid active:scale-[0.98]">Reset pwd</button>
                  <button type="button" onClick={() => handleDelete(s)} className="rounded-full border border-coral/25 px-3 py-1.5 text-[11px] text-coral active:scale-[0.98]">Remove</button>
                </div>
              </div>
            ))}
            {!students.length && <p className="py-8 text-center text-sm text-ink-low">No students match.</p>}
          </div>

          <div className="hidden overflow-x-auto px-5 pb-5 md:block">
            <table className="tbl w-full">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[27%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-ink-low">
                  <th className="px-2 pb-3 font-medium">Roll No</th>
                  <th className="px-2 pb-3 font-medium">Name</th>
                  <th className="px-2 pb-3 font-medium">Dept</th>
                  <th className="px-2 pb-3 text-right font-medium">CGPA</th>
                  <th className="px-2 pb-3 text-right font-medium">Grad</th>
                  <th className="px-2 pb-3 font-medium">Status</th>
                  <th className="px-2 pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="table-row border-t border-hairline">
                    <td className="px-2 py-3 font-medium tabular-nums text-ink-hi">{s.roll_no}</td>
                    <td className="px-2 py-3">
                      <button type="button" onClick={() => navigate(`/students/${s.id}`)} className="block text-left font-medium text-ink-hi transition-colors hover:text-green">{s.name}</button>
                      <div className="text-xs text-ink-mid">{s.email}</div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-ink-mid">{s.department}</div>
                      {multiProgram && <div className="text-[10px] uppercase tracking-wide text-ink-low">{s.program}</div>}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-ink-mid">{s.cgpa.toFixed(2)}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-ink-mid">{s.graduation_year}</td>
                    <td className="px-2 py-3"><StatusPill status={s.status} /></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-ink-mid transition-colors hover:bg-raise hover:text-ink-hi">Edit</button>
                        <button onClick={() => handleReset(s)} className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-ink-mid transition-colors hover:bg-raise hover:text-ink-hi">Reset pwd</button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-ink-mid transition-colors hover:bg-coral/10 hover:text-coral"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!students.length && (
                  <tr><td colSpan="7" className="py-10 text-center text-ink-low">No students match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
