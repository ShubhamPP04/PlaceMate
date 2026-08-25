import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Alert, Card, Field, GhostButton, PrimaryButton, StatusPill, inputClass } from '../components/ui'

const EMPTY = {
  roll_no: '', name: '', email: '', phone: '',
  program: 'B.Tech', department: '', cgpa: '', graduation_year: 2026, skills: '',
}

const toSkills = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

export default function Students() {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [programs, setPrograms] = useState(['B.Tech', 'BCA'])
  const [filters, setFilters] = useState({ q: '', dept: '', status: '', program: '' })
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null) // student id when editing
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [importReport, setImportReport] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async (f = filters) => {
    const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
    const data = await api.students(params ? `?${params}` : '')
    setStudents(data.students)
    setDepartments(data.departments)
    setPrograms(data.programs || ['B.Tech', 'BCA'])
  }, [filters])

  useEffect(() => { load(filters) /* eslint-disable-line react-hooks/exhaustive-deps */ }, [])

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
        await api.addStudent(body)
        setMessage({ kind: 'success', text: 'Student added — default password is their roll no.' })
      }
      setForm(EMPTY); setEditing(null); setShowForm(false)
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Remove ${s.name}?`)) return
    await api.deleteStudent(s.id)
    setMessage({ kind: 'info', text: `${s.name} removed.` })
    load()
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
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.importStudents(fd)
      setImportReport(res)
      setMessage({ kind: 'success', text: `Imported ${res.created} student(s).` })
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const TEMPLATE = 'roll_no,name,email,phone,program,department,cgpa,graduation_year,skills,status'

  return (
    <div className="space-y-6">
      <div className="rise flex items-end justify-between gap-4 pb-1 flex-wrap">
        <div>
          <p className="text-[12px] leading-none text-ink-low">{students.length} enrolled</p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Students</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={api.exportUrl('students')} className="btn-ghost">Export CSV</a>
          <GhostButton onClick={() => fileRef.current?.click()}>Import CSV</GhostButton>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          {showForm
            ? <GhostButton onClick={() => { setShowForm(false); setEditing(null) }}>Close</GhostButton>
            : <PrimaryButton onClick={openCreate}>Add student</PrimaryButton>}
        </div>
      </div>

      <div className="rise flex items-center gap-3">
        <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="students-template.csv" className="whitespace-nowrap text-[11px] text-ink-low underline decoration-dotted underline-offset-2 hover:text-ink-hi">
          Download CSV template
        </a>
        <span className="text-[11px] text-ink-low">· include a <span className="text-ink-mid">program</span> column (B.Tech / BCA)</span>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {importReport?.skipped?.length > 0 && (
        <Alert kind="danger" onClose={() => setImportReport(null)}>
          {importReport.skipped.length} row(s) skipped — first: {importReport.skipped[0].error}
        </Alert>
      )}

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
                  {['B.Tech', 'BCA'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Department *"><input className={inputClass} placeholder={form.program === 'BCA' ? 'BCA' : 'CSE'} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></Field>
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
              <div className="field-shell md:col-span-4">
                <input
                  className={inputClass}
                  placeholder="Search name or roll no…"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                />
              </div>
              <div className="field-shell md:col-span-2">
                <select className={inputClass} value={filters.program} onChange={(e) => setFilters({ ...filters, program: e.target.value })}>
                  <option value="">All programs</option>
                  {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
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
              <GhostButton className="justify-self-start md:col-span-2 md:justify-self-stretch" onClick={() => load()}>Apply</GhostButton>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="mobile-list flex md:hidden">
            {students.map((s) => (
              <div key={s.id} className="mobile-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink-hi">{s.name}</p>
                    <p className="mt-0.5 text-[12px] tabular-nums text-ink-mid">{s.roll_no}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-low">{s.email}</p>
                  </div>
                  <StatusPill status={s.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-mid">
                  <span>{s.department} · {s.program}</span>
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
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[24%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
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
                      <div className="font-medium text-ink-hi">{s.name}</div>
                      <div className="text-xs text-ink-mid">{s.email}</div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-ink-mid">{s.department}</div>
                      <div className="text-[10px] uppercase tracking-wide text-ink-low">{s.program}</div>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-ink-mid">{s.cgpa.toFixed(2)}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-ink-mid">{s.graduation_year}</td>
                    <td className="px-2 py-3"><StatusPill status={s.status} /></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="rounded-full border border-hairline px-3 py-1 text-[11px] text-ink-mid transition-all duration-500 hover:bg-raise active:scale-[0.98]">Edit</button>
                        <button onClick={() => handleReset(s)} className="rounded-full border border-hairline px-3 py-1 text-[11px] text-ink-mid transition-all duration-500 hover:bg-raise active:scale-[0.98]">Reset pwd</button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="rounded-full border border-coral/25 px-3 py-1 text-[11px] text-coral transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-coral/10 active:scale-[0.98]"
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
