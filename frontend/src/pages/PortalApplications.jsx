import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Card, StatusPill } from '../components/ui'

export default function PortalApplications() {
  const [apps, setApps] = useState([])
  const load = useCallback(() => api.portal.applications().then((d) => setApps(d.applications || [])), [])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="text-[12px] leading-none text-ink-low">{apps.length} applications</p>
        <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">My applications</h1>
      </div>

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
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-hairline py-3 text-center text-xs">
              <div className="text-ink-low">Package<span className="ml-1 font-semibold text-metric">{a.package_lpa ? a.package_lpa.toFixed(1) + ' LPA' : '—'}</span></div>
              <div className="text-ink-low">Drive date<span className="ml-1 font-semibold text-ink-hi">{a.drive_date || '—'}</span></div>
              <div className="text-ink-low">Applied<span className="ml-1 font-semibold text-ink-hi">{a.applied_at}</span></div>
            </div>
          </Card>
        ))}
        {!apps.length && (
          <Card className="p-0"><p className="py-10 text-center text-sm text-ink-low">You haven't applied to any drives yet.</p></Card>
        )}
      </div>
    </div>
  )
}
