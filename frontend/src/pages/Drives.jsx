import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Card, Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'

const EMPTY = {
  company_id: '', title: '', role: '', package_lpa: '',
  min_cgpa: '', drive_date: '', application_deadline: '',
  eligible_departments: '', eligible_programs: 'B.Tech',
}

function fmtDate(s) {
  if (!s) return 'Open-ended'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DrivePill({ drive }) {
  if (!drive.is_active) return <span className="pill pill-unplaced">Closed</span>
  if (!drive.is_accepting) return <span className="pill pill-rejected">Deadline passed</span>
  return <span className="pill pill-selected">Accepting</span>
}

export default function Drives() {
  const [drives, setDrives] = useState([])
  const [companies, setCompanies] = useState([])
  const [filters, setFilters] = useState({ q: '', status: '', company: '' })
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)

  const load = useCallback(async (f = filters) => {
    const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
    const data = await api.drives(params ? `?${params}` : '')
    setDrives(data.drives); setCompanies(data.companies)
  }, [filters])
  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [load])

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true); setMessage(null) }
  function openEdit(d) {
    setEditing(d.id)
    setForm({
      company_id: String(d.company_id), title: d.title, role: d.role,
      package_lpa: d.package_lpa ?? '', min_cgpa: d.min_cgpa ?? '',
      drive_date: d.drive_date || '', application_deadline: d.application_deadline || '',
      eligible_departments: (d.eligible_departments || []).join(', '),
      eligible_programs: (d.eligible_programs || ['B.Tech']).join(', '),
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const body = {
        ...form,
        eligible_departments: form.eligible_departments.split(',').map((s) => s.trim()).filter(Boolean),
        eligible_programs: form.eligible_programs.split(',').map((s) => s.trim()).filter(Boolean),
      }
      if (editing) {
        await api.updateDrive(editing, body)
        setMessage({ kind: 'success', text: 'Drive updated.' })
      } else {
        await api.addDrive(body)
        setMessage({ kind: 'success', text: 'Drive created.' })
      }
      setForm(EMPTY); setEditing(null); setShowForm(false)
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function handleToggle(d) {
    await api.toggleDrive(d.id)
    setMessage({ kind: 'info', text: `Drive "${d.title}" ${d.is_active ? 'closed' : 'reopened'}.` })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="flex items-center gap-2 text-[12px] leading-none text-ink-low">
            {drives.some((d) => d.is_active) && <span className="h-1.5 w-1.5 rounded-full bg-green" />}
            {drives.filter((d) => d.is_accepting).length} accepting of {drives.length}
          </p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Drives</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={api.exportUrl('drives')} className="btn-ghost">Export CSV</a>
          {showForm
            ? <GhostButton onClick={() => { setShowForm(false); setEditing(null) }}>Close</GhostButton>
            : <PrimaryButton onClick={openCreate}>New drive</PrimaryButton>}
        </div>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {showForm && (
        <div className="rise">
          <Card className="p-0">
            <form onSubmit={handleSubmit} className="grid gap-4 p-5 md:grid-cols-4">
              <Field label="Company *">
                <select className={inputClass} value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} required>
                  <option value="">Choose…</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Drive Title *"><input className={inputClass} placeholder="Campus Placement 2026" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
              <Field label="Role *"><input className={inputClass} placeholder="Software Engineer" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required /></Field>
              <Field label="Package (LPA)"><input type="number" step="0.1" min="0" className={inputClass} value={form.package_lpa} onChange={(e) => setForm({ ...form, package_lpa: e.target.value })} /></Field>
              <Field label="Min CGPA"><input type="number" step="0.1" min="0" max="10" className={inputClass} value={form.min_cgpa} onChange={(e) => setForm({ ...form, min_cgpa: e.target.value })} /></Field>
              <Field label="Drive Date"><input type="date" className={inputClass} value={form.drive_date} onChange={(e) => setForm({ ...form, drive_date: e.target.value })} /></Field>
              <Field label="Application Deadline"><input type="date" className={inputClass} value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} /></Field>
              <div className="md:col-span-2">
                <Field label="Eligible Departments (comma-sep)">
                  <input className={inputClass} placeholder="CSE, IT, ECE" value={form.eligible_departments} onChange={(e) => setForm({ ...form, eligible_departments: e.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Eligible Programs (comma-sep)">
                  <input className={inputClass} placeholder="B.Tech" value={form.eligible_programs} onChange={(e) => setForm({ ...form, eligible_programs: e.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-4">
                <PrimaryButton type="submit">{editing ? 'Save changes' : 'Create drive'}</PrimaryButton>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* filter row */}
      <div className="rise rise-d1 grid gap-2.5 md:grid-cols-4">
        <div className="field-shell md:col-span-2">
          <input className={inputClass} placeholder="Search title, role, company…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <div className="field-shell">
          <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <GhostButton className="justify-self-end" onClick={() => load()}>Apply filters</GhostButton>
      </div>

      {/* bento drive grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {drives.map((d, i) => (
          <div key={d.id} className={`rise rise-d${Math.min(i % 6 + 1, 6)}`}>
            <Card className="h-full p-5">
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <DrivePill drive={d} />
                  <span className="text-xs text-ink-low">{fmtDate(d.drive_date)}</span>
                </div>

                <h3 className="font-display text-xl font-semibold tracking-tight text-ink-hi">{d.title}</h3>
                <p className="mt-1.5 text-sm text-ink-mid">{d.company_name} · {d.role}</p>

                <div className="mt-5 grid grid-cols-3 rounded-2xl border border-hairline py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-display text-lg font-semibold tabular-nums text-metric">
                      {d.package_lpa ? d.package_lpa.toFixed(1) : '—'}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">LPA</div>
                  </div>
                  <div className="border-x border-hairline">
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-display text-lg font-semibold tabular-nums text-ink-hi">
                        {d.min_cgpa ? d.min_cgpa.toFixed(1) : '—'}
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Min CGPA</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-display text-lg font-semibold tabular-nums text-green">{d.applications_count}</div>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Applied</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-ink-low">
                  <span>Deadline: {fmtDate(d.application_deadline)}</span>
                </div>

                {d.eligible_departments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(d.eligible_programs || []).map((p) => (
                      <span key={p} className="rounded-full border border-green/30 bg-green-soft px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-green">{p}</span>
                    ))}
                    {d.eligible_departments.map((dept) => (
                      <span key={dept} className="rounded-full border border-hairline px-2.5 py-0.5 text-[10px] tracking-wide text-ink-mid">
                        {dept}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex gap-2 pt-5">
                  <GhostButton className="flex-1" onClick={() => handleToggle(d)}>
                    {d.is_active ? 'Close drive' : 'Reopen drive'}
                  </GhostButton>
                  <GhostButton onClick={() => openEdit(d)}>Edit</GhostButton>
                </div>
              </div>
            </Card>
          </div>
        ))}
        {!drives.length && (
          <div className="rise md:col-span-2 xl:col-span-3">
            <Card className="p-0"><p className="py-8 text-center text-sm text-ink-low">No drives match — create one above.</p></Card>
          </div>
        )}
      </div>
    </div>
  )
}
