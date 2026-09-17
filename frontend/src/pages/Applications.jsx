import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Alert, Card, EligibilityPill, GhostButton, StatusPill } from '../components/ui'

const STATUSES = ['applied', 'shortlisted', 'selected', 'rejected']
const FILTER_STATUSES = ['', ...STATUSES]

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [filters, setFilters] = useState({ q: '', status: '' })
  const [appliedFilters, setAppliedFilters] = useState({ q: '', status: '' })
  const listRequest = useRef(0)
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(null)
  const [message, setMessage] = useState(null)


  const load = useCallback(async (f = {}) => {
    const requestId = ++listRequest.current
    try {
      const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
      const data = await api.applications(params ? `?${params}` : '')
      if (requestId !== listRequest.current) return
      setApplications(data.applications)
      setAppliedFilters({ ...f })
    } catch (err) {
      if (requestId === listRequest.current) setMessage({ kind: 'danger', text: err.message })
    }
  }, [])
  useEffect(() => { load(filters) }, [load, filters])

  async function updateStatus(a, status, note = '') {
    if (saving !== null) return
    setSaving(a.id)
    try {
      await api.setApplicationStatus(a.id, status, note)
      setMessage({ kind: 'success', text: `Application marked ${status}.` })
      setNotes((current) => ({ ...current, [a.id]: '' }))
      await load(filters)
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setSaving(null)
    }
  }

  function statusForm(a) {
    return (
      <form
        className="flex min-w-[180px] flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.target)
          updateStatus(a, fd.get('status'), (fd.get('note') || '').trim())
        }}
      >
        <div className="field-shell min-w-0 flex-1">
          <select key={a.status} aria-label={`Status for ${a.student_name}`} disabled={saving !== null} name="status" defaultValue={a.status} className="field-input !px-3 !py-1.5 !text-xs">
            {STATUSES.map((st) => <option key={st} value={st}>{st[0].toUpperCase() + st.slice(1)}</option>)}
          </select>
        </div>
        <div className="field-shell order-last w-full">
          <input aria-label={`Optional status note for ${a.student_name}`} disabled={saving !== null} value={notes[a.id] || ''} onChange={(e) => setNotes((current) => ({ ...current, [a.id]: e.target.value }))} name="note" maxLength={2000} placeholder="Note (optional)" className="field-input !px-3 !py-1.5 !text-xs" />
        </div>
        <GhostButton type="submit" disabled={saving !== null} className="!px-3.5 !py-1.5 !text-xs">{saving === a.id ? 'Saving…' : 'Save'}</GhostButton>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">{applications.length} total</p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Applications</h1>
        </div>
        <a href={api.exportUrl('applications', appliedFilters)} className="btn-ghost">Export CSV</a>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="rise rise-d1">
        <Card className="p-0">
          <div className="p-5 pb-0">
            <div className="grid gap-2.5 md:grid-cols-4">
              <div className="field-shell md:col-span-2">
                <input
                  className="field-input"
                  placeholder="Search student, company or role…"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && load(filters)}
                />
              </div>
              <div className="field-shell">
                <select className="field-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  {FILTER_STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'All statuses'}</option>)}
                </select>
              </div>
              <GhostButton className="justify-self-start md:justify-self-stretch" onClick={() => load(filters)}>Apply</GhostButton>
            </div>
          </div>
          <div className="mobile-list flex md:hidden">
            {applications.map((a) => (
              <div key={a.id} className="mobile-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink-hi">{a.student_name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-low">{a.roll_no} · {a.department}</p>
                    <p className="mt-1 truncate text-[13px] text-ink-mid">{a.company_name} · {a.drive_role}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-ink-low">{a.applied_at}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill status={a.status} />
                    {a.eligible ? <span className="pill pill-selected">Eligible</span> : <EligibilityPill reason={a.ineligible_reason} />}
                  </div>
                </div>
                <div className="actions w-full flex-col items-stretch !gap-1.5">
                  {statusForm(a)}
                  <span className="text-[10px] text-ink-low">Optional note — visible to the student in status history.</span>
                </div>
              </div>
            ))}
            {!applications.length && <p className="py-8 text-center text-sm text-ink-low">No applications match.</p>}
          </div>

          <div className="hidden overflow-x-auto px-5 pt-5 md:block">
            <table className="tbl w-full">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[15%]" />
                <col className="w-[17%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-ink-low">
                  <th className="px-2 pb-3 font-medium">Student</th>
                  <th className="px-2 pb-3 font-medium">Drive</th>
                  <th className="px-2 pb-3 font-medium">Company</th>
                  <th className="px-2 pb-3 font-medium">Applied</th>
                  <th className="px-2 pb-3 font-medium">Status</th>
                  <th className="px-2 pb-3 font-medium">Eligible</th>
                  <th className="px-2 pb-3 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="table-row border-t border-hairline">
                    <td className="px-2 py-3">
                      <div className="font-medium text-ink-hi">{a.student_name}</div>
                      <div className="text-xs text-ink-low">{a.roll_no} · {a.department}</div>
                    </td>
                    <td className="px-2 py-3 text-ink-mid">{a.drive_role}</td>
                    <td className="px-2 py-3 text-ink-mid">{a.company_name}</td>
                    <td className="px-2 py-3 tabular-nums text-ink-mid">{a.applied_at}</td>
                    <td className="px-2 py-3"><StatusPill status={a.status} /></td>
                    <td className="px-2 py-3">
                      {a.eligible ? <span className="pill pill-selected">Eligible</span> : <EligibilityPill reason={a.ineligible_reason} />}
                    </td>
                    <td className="px-2 py-3">
                      {statusForm(a)}
                    </td>
                  </tr>
                ))}
                {!applications.length && (
                  <tr><td colSpan="7" className="py-10 text-center text-ink-low">No applications match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="h-5" />
        </Card>
      </div>
    </div>
  )
}
