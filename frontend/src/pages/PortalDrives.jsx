import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Card, PrimaryButton } from '../components/ui'

function fmtDate(s) {
  if (!s) return 'Open-ended'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusPill({ children, tone }) {
  const cls = tone === 'applied' ? 'pill-applied' : tone === 'eligible' ? 'pill-selected' : 'pill-rejected'
  return <span className={`pill ${cls}`}>{children}</span>
}

export default function PortalDrives() {
  const [drives, setDrives] = useState([])
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => api.portal.drives().then((d) => setDrives(d.drives || [])), [])
  useEffect(() => { load() }, [load])

  async function handleApply(d) {
    setBusyId(d.id)
    try {
      await api.portal.apply(d.id)
      setMessage({ kind: 'success', text: `Applied to "${d.company_name} · ${d.role}".` })
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">{drives.filter((d) => d.accepting).length} of {drives.length} accepting applications</p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Drives</h1>
        </div>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {drives.map((d, i) => (
          <div key={d.id} className={`rise rise-d${Math.min(i % 6 + 1, 6)}`}>
            <Card className={`h-full p-5 ${d.eligible ? '' : 'opacity-80'}`}>
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between">
                  {d.accepting
                    ? <StatusPill tone="eligible">Accepting</StatusPill>
                    : <StatusPill tone="rejected">Closed</StatusPill>}
                  <span className="text-xs text-ink-low">{fmtDate(d.drive_date)}</span>
                </div>

                <h3 className="font-display text-xl font-semibold tracking-tight text-ink-hi">{d.company_name}</h3>
                <p className="mt-1.5 text-sm text-ink-mid">{d.title} · {d.role}</p>

                <div className="mt-4 grid grid-cols-3 rounded-2xl border border-hairline py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-display text-lg font-semibold tabular-nums text-metric">{d.package_lpa ? d.package_lpa.toFixed(1) : '—'}</div>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">LPA</div>
                  </div>
                  <div className="border-x border-hairline">
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-display text-lg font-semibold tabular-nums text-ink-hi">{d.min_cgpa ? d.min_cgpa.toFixed(1) : '—'}</div>
                      <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Min CGPA</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-display text-lg font-semibold tabular-nums text-green">{d.applied ? 'Applied' : '—'}</div>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Status</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-low">
                  <span>Deadline: {fmtDate(d.application_deadline)}</span>
                </div>

                <div className="mt-auto pt-4">
                  {d.applied ? (
                    <div className="w-full rounded-xl border border-hairline py-2.5 text-center text-sm text-green">
                      Already applied · {d.application_status || 'applied'}
                    </div>
                  ) : d.eligible ? (
                    <PrimaryButton className="w-full justify-center" onClick={() => handleApply(d)} disabled={busyId === d.id}>
                      {busyId === d.id ? 'Applying…' : 'Apply now'}
                    </PrimaryButton>
                  ) : (
                    <div className="w-full rounded-xl border border-coral/25 bg-coral/10 py-2.5 px-3 text-center text-xs text-coral" title={d.ineligible_reason}>
                      Not eligible · {d.ineligible_reason || 'check requirements'}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ))}
        {!drives.length && (
          <div className="rise md:col-span-2 xl:col-span-3">
            <Card className="p-0"><p className="py-8 text-center text-sm text-ink-low">No drives available right now.</p></Card>
          </div>
        )}
      </div>
    </div>
  )
}
