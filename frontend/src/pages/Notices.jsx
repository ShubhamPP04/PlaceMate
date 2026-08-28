import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Card, Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'

const EMPTY = { title: '', body: '', audience: 'students' }

export default function Notices() {
  const [notices, setNotices] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)

  const load = useCallback(() => api.notices().then((d) => setNotices(d.notices)), [])
  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await api.addNotice(form)
      setForm(EMPTY); setShowForm(false)
      setMessage({ kind: 'success', text: 'Notice posted.' })
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function handleDelete(n) {
    if (!confirm(`Delete "${n.title}"?`)) return
    await api.deleteNotice(n.id)
    setMessage({ kind: 'info', text: 'Notice deleted.' })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">{notices.length} announcements</p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Notices</h1>
        </div>
        {showForm
          ? <GhostButton onClick={() => setShowForm(false)}>Close</GhostButton>
          : <PrimaryButton onClick={() => setShowForm(true)}>New notice</PrimaryButton>}
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {showForm && (
        <div className="rise">
          <Card className="p-0">
            <form onSubmit={handleSubmit} className="grid gap-4 p-5 md:grid-cols-4">
              <div className="md:col-span-3">
                <Field label="Title *"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
              </div>
              <Field label="Audience">
                <select className={inputClass} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                  <option value="students">Students</option>
                  <option value="all">Everyone</option>
                </select>
              </Field>
              <div className="md:col-span-4">
                <Field label="Body *"><textarea className={`${inputClass} min-h-[90px]`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></Field>
              </div>
              <div className="md:col-span-4">
                <PrimaryButton type="submit">Post notice</PrimaryButton>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {notices.map((n, i) => (
          <div key={n.id} className={`rise rise-d${Math.min(i % 6 + 1, 6)}`}>
            <Card className="h-full p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className={`pill ${n.audience === 'all' ? 'pill-selected' : 'pill-applied'}`}>{n.audience === 'all' ? 'Everyone' : 'Students'}</span>
                <span className="text-[11px] text-ink-low">{n.created_at}</span>
              </div>
              <h3 className="font-display text-[16px] font-bold tracking-tight text-ink-hi">{n.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">{n.body}</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleDelete(n)}
                  className="rounded-full border border-coral/25 px-3 py-1 text-[11px] text-coral transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-coral/10 active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>
            </Card>
          </div>
        ))}
        {!notices.length && (
          <div className="rise md:col-span-2">
            <Card className="p-0"><p className="py-8 text-center text-sm text-ink-low">No notices yet.</p></Card>
          </div>
        )}
      </div>
    </div>
  )
}
