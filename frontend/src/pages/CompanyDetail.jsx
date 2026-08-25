import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Logo from '../components/Logo'
import { Card, GhostButton } from '../components/ui'

function fmtDate(s) {
  if (!s) return 'TBD'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-low">{label}</p>
      <p className="mt-0.5 truncate text-sm text-ink-hi">{children || '—'}</p>
    </div>
  )
}

export default function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.company(id)
      .then((d) => setCompany(d.company))
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="text-coral">{error}</p>
  if (!company) return <p className="py-24 text-center text-ink-low">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="rise flex items-end justify-between gap-4 pb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <Logo website={company.website} name={company.name} size={44} />
          <div>
            <p className="text-[12px] leading-none text-ink-low">
              <button onClick={() => navigate('/companies')} className="text-ink-low transition-colors hover:text-ink-hi">Companies</button>
              <span className="mx-1.5">/</span>{company.name}
            </p>
            <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">{company.name}</h1>
            <p className="mt-1.5 text-sm text-ink-mid">{company.industry || '—'}</p>
          </div>
        </div>
        <GhostButton onClick={() => navigate(-1)}>← Back</GhostButton>
      </div>

      <div className="rise rise-d1 arc-card px-5 py-4">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Industry">{company.industry}</Detail>
          <Detail label="Website">
            {company.website
              ? <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-green transition-opacity hover:opacity-70">{company.website}</a>
              : null}
          </Detail>
          <Detail label="HR Email">{company.hr_email}</Detail>
          <Detail label="Drives">{company.drives_count}</Detail>
        </div>
      </div>

      <div className="rise rise-d2">
        <div className="mb-3 flex h-8 items-center justify-between">
          <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Drives</h2>
          <span className="text-[11px] leading-none text-ink-low">{company.drives.length} total</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {company.drives.map((d, i) => (
            <div key={d.id} className={`rise rise-d${Math.min(i % 6 + 1, 6)}`}>
              <Card className="h-full p-5">
                <button onClick={() => navigate(`/drives/${d.id}`)} className="flex h-full flex-col text-left">
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`pill ${d.is_active ? 'pill-selected' : 'pill-unplaced'}`}>{d.is_active ? 'Active' : 'Closed'}</span>
                    <span className="text-xs text-ink-low">{fmtDate(d.drive_date)}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-ink-hi">{d.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-mid">{d.role}</p>
                  <div className="mt-5 grid grid-cols-3 rounded-2xl border border-hairline py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-display text-lg font-semibold tabular-nums text-lime">{d.package_lpa ? d.package_lpa.toFixed(1) : '—'}</div>
                      <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">LPA</div>
                    </div>
                    <div className="border-x border-hairline">
                      <div className="flex flex-col items-center gap-1">
                        <div className="font-display text-lg font-semibold tabular-nums text-ink-hi">{d.min_cgpa ? d.min_cgpa.toFixed(1) : '—'}</div>
                        <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Min CGPA</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-display text-lg font-semibold tabular-nums text-green">{d.applications_count}</div>
                      <div className="text-[9px] uppercase tracking-[0.14em] text-ink-low">Applied</div>
                    </div>
                  </div>
                </button>
              </Card>
            </div>
          ))}
          {!company.drives.length && (
            <div className="md:col-span-2 xl:col-span-3">
              <Card className="p-0"><p className="py-8 text-center text-sm text-ink-low">No drives for this company yet.</p></Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
