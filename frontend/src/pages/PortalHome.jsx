import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { StatusPill } from '../components/ui'

function fmtDate(s) {  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PortalHome() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.portal.summary().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-coral">{error}</p>
  if (!data) return <p className="py-24 text-center text-ink-low">Loading…</p>

  const { profile, application_counts: counts, upcoming, notices } = data
  const totalApps = Object.values(counts).reduce((a, b) => a + b, 0)
  const status = profile.status

  const CARDS = [
    { label: 'Applied', value: counts.applied },
    { label: 'Shortlisted', value: counts.shortlisted },
    { label: 'Selected', value: counts.selected },
    { label: 'Rejected', value: counts.rejected },
  ]

  const recent = [
    { label: 'Apply to drives', sub: 'Browse open drives you qualify for', to: '/portal/drives' },
    { label: 'Track applications', sub: `${totalApps} application(s) so far`, to: '/portal/applications' },
    { label: 'Update profile', sub: 'Keep phone & skills current', to: '/portal/profile' },
  ]

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="text-[12px] leading-none text-ink-low">{profile.program} · {profile.department} · {profile.roll_no} · CGPA {profile.cgpa.toFixed(2)}</p>
        <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">
          Welcome back, {profile.name.split(' ')[0]}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <StatusPill status={status} />
          <span className="text-[11px] text-ink-low">Your current placement status</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="rise rise-d1 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.label} className="arc-card flex h-full min-h-[100px] flex-col justify-between p-4 sm:min-h-[110px] sm:p-5">
            <p className="text-[11px] font-bold uppercase leading-none tracking-wide text-ink-low">{c.label}</p>
            <p className="kpi-num font-display text-[36px] font-extrabold leading-none tabular-nums text-ink-hi">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rise rise-d2 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* upcoming deadlines */}
        <div className="arc-card p-5">
          <h2 className="font-display mb-4 text-[15px] font-bold leading-none text-ink-hi">Upcoming deadlines</h2>
          {upcoming.length ? (
            <div className="space-y-2">
              {upcoming.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate('/portal/drives')}
                  className="msg-row flex w-full items-center justify-between text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink-hi">{u.company_name} · {u.title}</p>
                    <p className="text-[11px] text-ink-low">{u.package_lpa ? `${u.package_lpa.toFixed(1)} LPA` : 'Package TBD'}</p>
                  </div>
                  <span className="ml-3 shrink-0 text-[11px] text-lime">{fmtDate(u.deadline)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-ink-low">No open drives with deadlines right now.</p>
          )}

          <div className="mt-6 border-t border-hairline" />
          <h2 className="font-display mb-3 mt-6 text-[15px] font-bold leading-none text-ink-hi">Latest notices</h2>
          {notices.length ? (
            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n.id} className="rounded-xl border border-hairline bg-raise p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink-hi">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-ink-low">{n.created_at}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-mid">{n.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-low">No notices yet.</p>
          )}
        </div>

        {/* quick actions */}
        <div className="arc-card p-5">
          <h2 className="font-display mb-4 text-[15px] font-bold leading-none text-ink-hi">Quick actions</h2>
          <div className="space-y-2">
            {recent.map((r) => (
              <button
                key={r.label}
                onClick={() => navigate(r.to)}
                className="msg-row flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="text-[13px] font-semibold text-ink-hi">{r.label}</p>
                  <p className="text-[11px] text-ink-low">{r.sub}</p>
                </div>
                <span className="text-green">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
