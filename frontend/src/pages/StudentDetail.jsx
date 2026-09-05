import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Alert, Card, GhostButton, StatusPill } from '../components/ui'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline/60 py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.12em] text-ink-low">{label}</span>
      <span className="text-right text-sm text-ink-hi">{children || '—'}</span>
    </div>
  )
}

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [applications, setApplications] = useState([])
  const [offers, setOffers] = useState([])
  const [edits, setEdits] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)

  function load() {
    api.student(id)
      .then((d) => {
        setStudent(d.student)
        setApplications(d.applications || [])
        setOffers(d.offers || [])
      })
      .catch((e) => setError(e.message))
  }
  useEffect(() => { load() }, [id])

  async function saveOffer(e, o) {
    e.preventDefault()
    try {
      const { offer } = await api.updateOffer(id, o.id, { package_lpa: edits[o.id] ?? o.package_lpa ?? '' })
      setOffers((list) => list.map((x) => (x.id === offer.id ? offer : x)))
      setMessage({ kind: 'success', text: 'Offer package updated.' })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  if (error) return <p className="text-coral">{error}</p>
  if (!student) return <p className="py-24 text-center text-ink-low">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">
            <button onClick={() => navigate('/students')} className="text-ink-low transition-colors hover:text-ink-hi">Students</button>
            <span className="mx-1.5">/</span>
            {student.name}
          </p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">{student.name}</h1>
          <p className="mt-1.5 text-sm text-ink-mid">
            {student.roll_no} · {student.department} · {student.program}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={student.status} />
          <GhostButton onClick={() => navigate(-1)}>← Back</GhostButton>
        </div>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* profile block */}
        <div className="rise rise-d1">
          <Card className="px-5 py-4">
            <div className="mb-3 flex h-8 items-center justify-between">
              <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Profile</h2>
            </div>
            <Row label="Roll No">{student.roll_no}</Row>
            <Row label="Department">{student.department}</Row>
            <Row label="Program">{student.program}</Row>
            <Row label="Email">{student.email}</Row>
            <Row label="Phone">{student.phone}</Row>
            <Row label="CGPA">{student.cgpa?.toFixed(2)}</Row>
            <Row label="Graduation">{student.graduation_year}</Row>
            <Row label="Skills">
              {student.skills?.length
                ? <span className="flex flex-wrap justify-end gap-1.5">
                    {student.skills.map((s) => <span key={s} className="rounded-full border border-hairline px-2.5 py-0.5 text-[10px] tracking-wide text-ink-mid">{s}</span>)}
                  </span>
                : null}
            </Row>
          </Card>
        </div>

        {/* offers block */}
        <div className="rise rise-d2">
          <Card className="px-5 py-4">
            <div className="mb-3 flex h-8 items-center justify-between">
              <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Offers</h2>
              <span className="text-[11px] leading-none text-ink-low">{offers.length} {offers.length === 1 ? 'offer' : 'offers'}</span>
            </div>
            {!offers.length ? (
              <p className="py-6 text-center text-sm text-ink-low">No offers yet — mark an application as Selected to record one.</p>
            ) : (
              <div className="space-y-2">
                {offers.map((o) => (
                  <div key={o.id} className="rounded-xl border border-hairline bg-raise p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink-hi">{o.company_name} · {o.role}</p>
                        <p className="mt-0.5 text-[11px] text-ink-low">
                          Offered {fmtDate(o.offered_on)} · advertised {o.drive_package_lpa ? o.drive_package_lpa.toFixed(1) : '—'} LPA
                        </p>
                      </div>
                      <StatusPill status="selected" />
                    </div>
                    <form onSubmit={(e) => saveOffer(e, o)} className="mt-3 flex items-center gap-2">
                      <div className="field-shell !w-[140px]">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="field-input !px-3 !py-1.5 !text-xs"
                          value={edits[o.id] ?? (o.package_lpa ?? '')}
                          onChange={(e) => setEdits({ ...edits, [o.id]: e.target.value })}
                        />
                      </div>
                      <span className="text-[11px] text-ink-low">LPA (actual)</span>
                      <GhostButton type="submit" className="ml-auto !px-3 !py-1.5 !text-xs">Save</GhostButton>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* applications block */}
      <div className="rise rise-d3">
        <Card className="p-0">
          <div className="flex h-8 items-center justify-between px-5 pt-5">
            <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Applications</h2>
            <span className="text-[11px] leading-none text-ink-low">{applications.length} drives</span>
          </div>

          {/* Mobile card list */}
          <div className="mobile-list mt-3 flex md:hidden">
            {applications.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/applications/${a.id}`)}
                className="mobile-list-card block w-full text-left active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink-hi">{a.drive_role}</p>
                    <p className="mt-0.5 text-[12px] text-ink-mid">{a.company_name}</p>
                  </div>
                  <StatusPill status={a.status} />
                </div>
                <p className="mt-2 text-[11px] tabular-nums text-ink-low">Applied {a.applied_at}</p>
              </button>
            ))}
            {!applications.length && <p className="py-8 text-center text-sm text-ink-low">No applications yet.</p>}
          </div>

          <div className="mt-3 hidden overflow-x-auto px-5 pt-5 pb-5 md:block">
            <table className="tbl w-full">
              <colgroup>
                <col className="w-[34%]" /><col className="w-[26%]" /><col className="w-[16%]" /><col className="w-[12%]" /><col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-ink-low">
                  <th className="px-2 pb-3 font-medium">Drive</th>
                  <th className="px-2 pb-3 font-medium">Company</th>
                  <th className="px-2 pb-3 font-medium">Applied</th>
                  <th className="px-2 pb-3 font-medium">Status</th>
                  <th className="px-2 pb-3" />
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="table-row border-t border-hairline">
                    <td className="px-2 py-3 font-medium text-ink-hi">
                      <button onClick={() => navigate(`/applications/${a.id}`)} className="text-left transition-opacity hover:opacity-70">{a.drive_role}</button>
                    </td>
                    <td className="px-2 py-3 text-ink-mid">{a.company_name}</td>
                    <td className="px-2 py-3 tabular-nums text-ink-mid">{a.applied_at}</td>
                    <td className="px-2 py-3"><StatusPill status={a.status} /></td>
                    <td className="px-2 py-3 text-right">
                      <button onClick={() => navigate(`/applications/${a.id}`)} className="text-[11px] text-green transition-opacity hover:opacity-70">View →</button>
                    </td>
                  </tr>
                ))}
                {!applications.length && (
                  <tr><td colSpan="5" className="py-10 text-center text-ink-low">No applications yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
