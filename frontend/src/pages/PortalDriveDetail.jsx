import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Logo from '../components/Logo'
import { Alert, Card, GhostButton, PrimaryButton } from '../components/ui'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PortalDriveDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [drive, setDrive] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  function load() {
    api.portal.drive(id)
      .then((d) => setDrive(d.drive))
      .catch((e) => setError(e.message))
  }
  useEffect(() => { load() }, [id])

  async function handleApply() {
    setBusy(true)
    try {
      await api.portal.apply(drive.id)
      setMessage({ kind: 'success', text: `Applied to "${drive.company_name} · ${drive.role}".` })
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="text-coral">{error}</p>
  if (!drive) return <p className="py-24 text-center text-ink-low">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <Logo website={drive.company_website} name={drive.company_name} size={44} />
          <div>
            <p className="text-[12px] leading-none text-ink-low">
              <button onClick={() => navigate('/portal/drives')} className="text-ink-low transition-colors hover:text-ink-hi">Drives</button>
              <span className="mx-1.5">/</span>
              {drive.title}
            </p>
            <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">{drive.title}</h1>
            <p className="mt-1.5 text-sm text-ink-mid">
              {drive.company_name}
              <span className="mx-1.5 text-ink-low">·</span>{drive.role}
            </p>
          </div>
        </div>
        <GhostButton onClick={() => navigate(-1)}>← Back</GhostButton>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="rise rise-d1">
        <Card className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            {drive.accepting
              ? <span className="pill pill-selected">Accepting</span>
              : <span className="pill pill-rejected">Closed</span>}
            <span className="text-xs text-ink-low">{fmtDate(drive.drive_date)}</span>
          </div>

          <div className="grid grid-cols-3 rounded-2xl border border-hairline py-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="font-display text-lg font-semibold tabular-nums text-metric">{drive.package_lpa ? drive.package_lpa.toFixed(1) : '—'}</div>
              <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">LPA</div>
            </div>
            <div className="border-x border-hairline">
              <div className="flex flex-col items-center gap-1">
                <div className="font-display text-lg font-semibold tabular-nums text-ink-hi">{drive.min_cgpa ? drive.min_cgpa.toFixed(1) : '—'}</div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Min CGPA</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="font-display text-lg font-semibold tabular-nums text-green">{drive.applied ? 'Applied' : '—'}</div>
              <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Status</div>
            </div>
          </div>

          {drive.eligible_departments?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(drive.eligible_programs || []).map((p) => (
                <span key={p} className="rounded-full border border-green/30 bg-green-soft px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-green">{p}</span>
              ))}
              {drive.eligible_departments.map((dept) => (
                <span key={dept} className="rounded-full border border-hairline px-2.5 py-0.5 text-[10px] tracking-wide text-ink-mid">{dept}</span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-low">
            <span>Deadline: {fmtDate(drive.application_deadline)}</span>
          </div>

          <div className="mt-4">
            {drive.applied ? (
              <div className="w-full rounded-xl border border-hairline py-2.5 text-center text-sm text-green">
                Already applied · {drive.application_status || 'applied'}
              </div>
            ) : drive.eligible ? (
              <PrimaryButton className="w-full justify-center" onClick={handleApply} disabled={busy}>
                {busy ? 'Applying…' : 'Apply now'}
              </PrimaryButton>
            ) : (
              <div className="w-full rounded-xl border border-coral/25 bg-coral/10 py-2.5 px-3 text-center text-xs text-coral" title={drive.ineligible_reason || ''}>
                Not eligible · {drive.ineligible_reason || 'check requirements'}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
