import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Alert, Card, Field, GhostButton, PrimaryButton, StatusPill, inputClass } from '../components/ui'

const STATUSES = ['applied', 'shortlisted', 'selected', 'rejected']
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)

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

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)

  function load() {
    api.application(id)
      .then((d) => setApp(d.application))
      .catch((e) => setError(e.message))
  }
  useEffect(() => { load() }, [id])

  async function updateStatus(e) {
    e.preventDefault()
    const status = new FormData(e.target).get('status')
    try {
      await api.setApplicationStatus(app.id, status)
      setMessage({ kind: 'success', text: `Application marked ${status}.` })
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  if (error) return <p className="text-coral">{error}</p>
  if (!app) return <p className="py-24 text-center text-ink-low">Loading…</p>

  const student = app.student
  const drive = app.drive

  return (
    <div className="space-y-4">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">
            <button onClick={() => navigate('/applications')} className="text-ink-low transition-colors hover:text-ink-hi">Applications</button>
            <span className="mx-1.5">/</span>#{app.id}
          </p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">{app.student_name}</h1>
          <p className="mt-1.5 text-sm text-ink-mid">
            {app.roll_no} · {app.department}
            <span className="mx-1.5 text-ink-low">·</span>{app.company_name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={app.status} />
          <GhostButton onClick={() => navigate(-1)}>← Back</GhostButton>
        </div>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* student block */}
        <div className="rise rise-d1">
          <Card className="px-5 py-4">
            <div className="mb-3 flex h-8 items-center justify-between">
              <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Student</h2>
              <StatusPill status={student.status} />
            </div>
            <Row label="Name">{student.name}</Row>
            <Row label="Roll No">{student.roll_no}</Row>
            <Row label="Department">{student.department}</Row>
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

        {/* drive block */}
        <div className="rise rise-d2">
          <Card className="px-5 py-4">
            <div className="mb-3 flex h-8 items-center justify-between">
              <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Drive</h2>
              <span className={`pill ${drive.is_active ? 'pill-selected' : 'pill-unplaced'}`}>{drive.is_active ? 'Active' : 'Closed'}</span>
            </div>
            <Row label="Title">
              <button onClick={() => navigate(`/drives/${drive.id}`)} className="text-green transition-opacity hover:opacity-70">{drive.title}</button>
            </Row>
            <Row label="Role">{drive.role}</Row>
            <Row label="Company">
              <button onClick={() => navigate(`/companies/${drive.company_id}`)} className="text-green transition-opacity hover:opacity-70">{drive.company_name}</button>
            </Row>
            <Row label="Package">{drive.package_lpa ? `${drive.package_lpa.toFixed(1)} LPA` : null}</Row>
            <Row label="Min CGPA">{drive.min_cgpa ? drive.min_cgpa.toFixed(1) : null}</Row>
            <Row label="Drive Date">{fmtDate(drive.drive_date)}</Row>
            <Row label="Eligible Depts">
              {drive.eligible_departments?.length
                ? <span className="flex flex-wrap justify-end gap-1.5">
                    {drive.eligible_departments.map((d) => <span key={d} className="rounded-full border border-hairline px-2.5 py-0.5 text-[10px] tracking-wide text-ink-mid">{d}</span>)}
                  </span>
                : null}
            </Row>
            <Row label="Applied">{app.applied_at}</Row>
          </Card>
        </div>
      </div>

      {/* status update */}
      <div className="rise rise-d3">
        <Card className="px-5 py-4">
          <h2 className="font-display mb-4 text-[15px] font-bold leading-none text-ink-hi">Update status</h2>
          <form onSubmit={updateStatus} className="flex items-center gap-3 flex-wrap">
            <div className="field-shell flex-1 sm:max-w-[240px]">
              <select name="status" defaultValue={app.status} className={inputClass}>
                {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
              </select>
            </div>
            <PrimaryButton type="submit" className="!px-5 !py-2.5 !text-[13px]">Save</PrimaryButton>
          </form>
        </Card>
      </div>
    </div>
  )
}
