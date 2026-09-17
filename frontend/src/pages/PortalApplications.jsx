import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Card, StatusPill } from '../components/ui'

export default function PortalApplications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await api.portal.applications()
      setApps(d.applications || [])
    } catch (err) {
      setError(err.message || 'Could not load your applications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const formatCtc = (value) => value == null || value === '' || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(1)} LPA`

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="text-[12px] leading-none text-ink-low">{loading ? 'Loading…' : `${apps.length} applications`}</p>
        <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">My applications</h1>
      </div>

      {error && <Alert kind="danger">{error} <button onClick={load} className="underline underline-offset-4">Retry</button></Alert>}

      <div className="rise rise-d1 grid gap-3">
        {apps.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-[16px] font-bold tracking-tight text-ink-hi">{a.company_name} · {a.role}</h3>
                <p className="mt-0.5 text-xs text-ink-mid">{a.title}</p>
              </div>
              <StatusPill status={a.status} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-hairline py-3 text-center text-xs sm:grid-cols-3">
              <div className="text-ink-low">Advertised CTC<span className="ml-1 font-semibold text-ink-hi">{formatCtc(a.package_lpa)}</span></div>
              <div className="text-ink-low">Drive date<span className="ml-1 font-semibold text-ink-hi">{a.drive_date || '—'}</span></div>
              <div className="text-ink-low">Applied<span className="ml-1 font-semibold text-ink-hi">{a.applied_at || '—'}</span></div>
            </div>
            {a.offer != null && (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-hairline bg-raise p-3 text-xs">
                <div className="text-ink-low">Actual offered CTC<span className="ml-1 font-semibold text-metric">{formatCtc(a.offer.package_lpa)}</span></div>
                <div className="text-ink-low">Offered on<span className="ml-1 font-semibold text-ink-hi">{a.offer.offered_on || '—'}</span></div>
              </div>
            )}
            {a.history?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.history.map((h, i) => (
                  <span key={i} className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-ink-mid">{h.status} · {h.created_at}</span>
                ))}
              </div>
            )}
          </Card>
        ))}
        {!loading && !error && !apps.length && (
          <Card className="p-0"><p className="py-10 text-center text-sm text-ink-low">You haven't applied to any drives yet.</p></Card>
        )}
      </div>
    </div>
  )
}
