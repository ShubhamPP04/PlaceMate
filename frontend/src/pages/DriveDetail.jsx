import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Logo from '../components/Logo'
import { Card, GhostButton, StatusPill } from '../components/ui'

function fmtDate(s) {
  if (!s) return 'TBD'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DriveDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [drive, setDrive] = useState(null)
  const [targets, setTargets] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.drive(id)
      .then((d) => setDrive(d.drive))
      .catch((e) => setError(e.message))
    api.driveTargets(id)
      .then((d) => setTargets(d.targets))
      .catch(() => setTargets([]))
  }, [id])

  if (error) return <p className="text-coral">{error}</p>
  if (!drive) return <p className="py-24 text-center text-ink-low">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="rise flex items-end justify-between gap-4 pb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <Logo website={drive.company_website} name={drive.company_name} size={44} />
          <div>
            <p className="text-[12px] leading-none text-ink-low">
              <button onClick={() => navigate('/drives')} className="text-ink-low transition-colors hover:text-ink-hi">Drives</button>
              <span className="mx-1.5">/</span>
              {drive.title}
            </p>
            <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">{drive.title}</h1>
            <p className="mt-1.5 text-sm text-ink-mid">
              <button onClick={() => navigate(`/companies/${drive.company_id}`)} className="text-green transition-opacity hover:opacity-70">{drive.company_name}</button>
              <span className="mx-1.5 text-ink-low">·</span>{drive.role}
            </p>
          </div>
        </div>
        <GhostButton onClick={() => navigate(-1)}>← Back</GhostButton>
      </div>

      <div className="rise rise-d1 arc-card px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className={`pill ${drive.is_active ? 'pill-selected' : 'pill-unplaced'}`}>{drive.is_active ? 'Active' : 'Closed'}</span>
          <span className="text-xs text-ink-low">{fmtDate(drive.drive_date)}</span>
        </div>

        <div className="grid grid-cols-3 rounded-2xl border border-hairline py-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="font-display text-lg font-semibold tabular-nums text-lime">{drive.package_lpa ? drive.package_lpa.toFixed(1) : '—'}</div>
            <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">LPA</div>
          </div>
          <div className="border-x border-hairline">
            <div className="flex flex-col items-center gap-1">
              <div className="font-display text-lg font-semibold tabular-nums text-ink-hi">{drive.min_cgpa ? drive.min_cgpa.toFixed(1) : '—'}</div>
              <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Min CGPA</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="font-display text-lg font-semibold tabular-nums text-green">{drive.applications_count}</div>
            <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Applied</div>
          </div>
        </div>

        {drive.eligible_departments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(drive.eligible_programs || []).map((p) => (
              <span key={p} className="rounded-full border border-green/30 bg-green-soft px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-green">{p}</span>
            ))}
            {drive.eligible_departments.map((dept) => (
              <span key={dept} className="rounded-full border border-hairline px-2.5 py-0.5 text-[10px] tracking-wide text-ink-mid">{dept}</span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 text-[11px] text-ink-low sm:flex-row sm:items-center sm:justify-between">
          <span>Apply by <span className={drive.is_accepting && drive.application_deadline ? 'text-ink-hi' : 'text-coral'}>{fmtDate(drive.application_deadline)}</span></span>
          <span className={`pill self-start ${drive.is_accepting ? 'pill-selected' : 'pill-rejected'}`}>{drive.is_accepting ? 'Accepting applications' : 'Not accepting'}</span>
        </div>
      </div>

      <div className="rise rise-d2">
        <Card className="p-0">
          <div className="flex h-8 items-center justify-between px-5 pt-5">
            <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Applications</h2>
            <span className="text-[11px] leading-none text-ink-low">{drive.applications.length} candidates</span>
          </div>
          <div className="mt-3 overflow-x-auto px-5 pt-5 pb-5">
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-[28%]" /><col className="w-[22%]" /><col className="w-[16%]" /><col className="w-[18%]" /><col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-ink-low">
                  <th className="px-2 pb-3 font-medium">Student</th>
                  <th className="px-2 pb-3 font-medium">Roll · Dept</th>
                  <th className="px-2 pb-3 font-medium">Applied</th>
                  <th className="px-2 pb-3 font-medium">Status</th>
                  <th className="px-2 pb-3" />
                </tr>
              </thead>
              <tbody>
                {drive.applications.map((a) => (
                  <tr key={a.id} className="table-row border-t border-hairline">
                    <td className="px-2 py-3 font-medium text-ink-hi">
                      <button onClick={() => navigate(`/applications/${a.id}`)} className="text-left transition-opacity hover:opacity-70">{a.student_name}</button>
                    </td>
                    <td className="px-2 py-3 text-ink-mid">{a.roll_no} · {a.department}</td>
                    <td className="px-2 py-3 tabular-nums text-ink-mid">{a.applied_at}</td>
                    <td className="px-2 py-3"><StatusPill status={a.status} /></td>
                    <td className="px-2 py-3 text-right">
                      <button onClick={() => navigate(`/applications/${a.id}`)} className="text-[11px] text-green transition-opacity hover:opacity-70">View →</button>
                    </td>
                  </tr>
                ))}
                {!drive.applications.length && (
                  <tr><td colSpan="5" className="py-10 text-center text-ink-low">No applications for this drive yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {targets && (
        <div className="rise rise-d3">
          <Card className="p-0">
            <div className="flex h-8 items-center justify-between px-5 pt-5">
              <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Eligible, not yet applied</h2>
              <span className="text-[11px] leading-none text-ink-low">{targets.length} candidates</span>
            </div>
            {targets.length ? (
              <div className="mt-3 overflow-x-auto px-5 pb-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.16em] text-ink-low">
                      <th className="px-2 py-3 font-medium">Roll No</th>
                      <th className="px-2 py-3 font-medium">Name</th>
                      <th className="px-2 py-3 font-medium">Dept</th>
                      <th className="px-2 py-3 text-right font-medium">CGPA</th>
                      <th className="px-2 py-3 font-medium">Skills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t) => (
                      <tr key={t.id} className="table-row border-t border-hairline">
                        <td className="px-2 py-3 font-medium tabular-nums text-ink-hi">{t.roll_no}</td>
                        <td className="px-2 py-3 text-ink-hi">{t.name}</td>
                        <td className="px-2 py-3 text-ink-mid">{t.department}</td>
                        <td className="px-2 py-3 text-right tabular-nums text-ink-mid">{t.cgpa.toFixed(2)}</td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(t.skills || []).map((sk) => (
                              <span key={sk} className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-ink-mid">{sk}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-ink-low">Everyone eligible has already applied.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
