import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Card, EligibilityPill, GhostButton, StatusPill } from '../components/ui'

const STATUSES = ['applied', 'shortlisted', 'selected', 'rejected']
const FILTER_STATUSES = ['', ...STATUSES]

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [filters, setFilters] = useState({ q: '', status: '' })
  const [message, setMessage] = useState(null)

  const load = useCallback(async (f = filters) => {
    const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
    const data = await api.applications(params ? `?${params}` : '')
    setApplications(data.applications)
  }, [filters])
  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [load])

  async function updateStatus(a, status) {
    try {
      await api.setApplicationStatus(a.id, status)
      setMessage({ kind: 'success', text: `Application marked ${status}.` })
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="rise flex items-end justify-between gap-4 pb-1 flex-wrap">
        <div>
          <p className="text-[12px] leading-none text-ink-low">{applications.length} total</p>
          <h1 className="font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Applications</h1>
        </div>
        <a href={api.exportUrl('applications')} className="btn-ghost">Export CSV</a>
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
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                />
              </div>
              <div className="field-shell">
                <select className="field-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  {FILTER_STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'All statuses'}</option>)}
                </select>
              </div>
              <GhostButton className="justify-self-start md:justify-self-stretch" onClick={() => load()}>Apply</GhostButton>
            </div>
          </div>
          <div className="overflow-x-auto px-5 pt-5">
            <table className="w-full text-sm">
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
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          updateStatus(a, new FormData(e.target).get('status'))
                        }}
                      >
                        <div className="field-shell !w-[130px]">
                          <select name="status" defaultValue={a.status} className="field-input !px-3 !py-1.5 !text-xs">
                            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </div>
                        <GhostButton type="submit" className="!px-3.5 !py-1.5 !text-xs">Save</GhostButton>
                      </form>
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
