import { useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Card, Field, PrimaryButton, inputClass } from '../components/ui'

export default function PortalProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ phone: '', skills: '' })
  const [pass, setPass] = useState({ current_password: '', new_password: '' })
  const [message, setMessage] = useState(null)

  useEffect(() => {
    api.portal.summary().then((d) => {
      setProfile(d.profile)
      setForm({ phone: d.profile.phone || '', skills: (d.profile.skills || []).join(', ') })
    }).catch(() => {})
  }, [])

  async function saveProfile(e) {
    e.preventDefault()
    try {
      const p = await api.portal.profile({ phone: form.phone, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) })
      setProfile(p.profile)
      setMessage({ kind: 'success', text: 'Profile updated.' })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    try {
      await api.changePassword(pass)
      setPass({ current_password: '', new_password: '' })
      setMessage({ kind: 'success', text: 'Password changed.' })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  if (!profile) return <p className="py-24 text-center text-ink-low">Loading…</p>

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="text-[12px] leading-none text-ink-low">{profile.roll_no} · {profile.department}</p>
        <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Profile</h1>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="rise rise-d1 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* profile card */}
        <Card className="p-5">
          <h2 className="font-display mb-4 text-[15px] font-bold leading-none text-ink-hi">Personal details</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-hairline bg-raise p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-low">Name</div>
              <div className="mt-1 text-sm font-semibold text-ink-hi">{profile.name}</div>
            </div>
            <div className="rounded-xl border border-hairline bg-raise p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-low">Email</div>
              <div className="mt-1 truncate text-sm font-semibold text-ink-hi">{profile.email}</div>
            </div>
            <div className="rounded-xl border border-hairline bg-raise p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-low">Program</div>
              <div className="mt-1 text-sm font-semibold text-ink-hi">{profile.program}</div>
            </div>
            <div className="rounded-xl border border-hairline bg-raise p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-low">Department</div>
              <div className="mt-1 text-sm font-semibold text-ink-hi">{profile.department}</div>
            </div>
            <div className="rounded-xl border border-hairline bg-raise p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-low">CGPA</div>
              <div className="mt-1 text-sm font-semibold text-ink-hi">{profile.cgpa.toFixed(2)}</div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-3">
            <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Skills (comma-sep)"><input className={inputClass} placeholder="Python, SQL, React" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
            <PrimaryButton type="submit">Save profile</PrimaryButton>
          </form>
        </Card>

        {/* password card */}
        <Card className="p-5">
          <h2 className="font-display mb-4 text-[15px] font-bold leading-none text-ink-hi">Change password</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <Field label="Current password"><input type="password" className={inputClass} value={pass.current_password} onChange={(e) => setPass({ ...pass, current_password: e.target.value })} required /></Field>
            <Field label="New password"><input type="password" className={inputClass} value={pass.new_password} onChange={(e) => setPass({ ...pass, new_password: e.target.value })} required /></Field>
            <PrimaryButton type="submit">Update password</PrimaryButton>
          </form>
        </Card>
      </div>
    </div>
  )
}
