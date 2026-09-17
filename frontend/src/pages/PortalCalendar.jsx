import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Alert, Card, GhostButton } from '../components/ui'
import { dateKey, driveEvents, monthGrid } from '../calendar'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PortalCalendar() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.portal.drives().then((data) => {
      if (!cancelled) setDrives(data.drives || [])
    }).catch((err) => {
      if (!cancelled) setError(err.message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [attempt])

  const events = driveEvents(drives)
  const year = month.getFullYear()
  const index = month.getMonth()
  const grid = monthGrid(month)
  const today = dateKey(new Date())
  const monthKey = dateKey(month).slice(0, 7)
  const eventCount = Object.entries(events).filter(([day]) => day.startsWith(monthKey)).reduce((sum, [, entries]) => sum + entries.length, 0)

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="text-[12px] text-ink-low">Recruitment dates and application deadlines</p>
        <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Calendar</h1>
      </div>
      {error && <Alert kind="danger">{error} <button type="button" className="underline" onClick={() => { setLoading(true); setError(''); setAttempt((value) => value + 1) }}>Retry</button></Alert>}
      <Card className="p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 aria-live="polite" className="font-display text-lg font-bold text-ink-hi">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-2">
            <GhostButton aria-label="Previous month" onClick={() => setMonth(new Date(year, index - 1, 1))}>←</GhostButton>
            <GhostButton onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)) }}>Today</GhostButton>
            <GhostButton aria-label="Next month" onClick={() => setMonth(new Date(year, index + 1, 1))}>→</GhostButton>
          </div>
        </div>
        <p className="mb-4 text-xs text-ink-low">Drive dates and deadlines appear separately. Select an event to open its drive. Swipe horizontally on smaller screens.</p>
        {loading ? <p role="status" className="py-16 text-center text-ink-low">Loading calendar…</p> : !error && (
          <>
            <div className="overflow-x-auto rounded-xl border border-hairline" tabIndex={0} role="region" aria-label="Monthly recruitment calendar">
              <div className="grid min-w-[700px] grid-cols-7">
                {WEEKDAYS.map((day) => <div key={day} className="border-b border-hairline bg-raise p-3 text-center text-xs font-semibold text-ink-mid">{day}</div>)}
                {grid.map((date, cell) => {
                  if (!date) return <div key={cell} aria-hidden="true" className="min-h-[120px] border-b border-r border-hairline bg-raise" />
                  const day = date.getDate()
                  const key = dateKey(date)
                  return (
                    <div key={cell} className={`min-h-[120px] space-y-2 border-b border-r border-hairline p-2 ${key === today ? 'bg-green/10' : ''}`}>
                      <time dateTime={key} aria-current={key === today ? 'date' : undefined} className={`block text-xs font-semibold ${key === today ? 'text-green' : 'text-ink-mid'}`}>{day}{key === today ? ' · Today' : ''}</time>
                      {(events[key] || []).map(({ drive, label }) => (
                        <Link key={`${drive.id}-${label}`} to={`/portal/drives/${drive.id}`} className="block rounded-lg border border-hairline bg-raise p-2 text-[11px] focus-visible:outline-2 focus-visible:outline-green">
                          <span className={`block font-semibold ${label === 'Deadline' ? 'text-coral' : 'text-green'}`}>{label}</span>
                          <span className="mt-1 block break-words text-ink-hi">{drive.company_name} · {drive.role}</span>
                          <span className="mt-1 block text-ink-low">{drive.applied ? 'Applied' : !drive.accepting ? 'Closed' : drive.eligible ? 'Eligible' : 'Not eligible'}</span>
                        </Link>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
            {!eventCount && <p className="mt-4 text-center text-sm text-ink-low">No drive dates or deadlines this month. Try another month.</p>}
          </>
        )}
      </Card>
    </div>
  )
}
