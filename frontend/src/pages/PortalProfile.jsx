import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Alert, Card, Field, PrimaryButton, inputClass } from '../components/ui'

const MAX_RESUME_BYTES = 2 * 1024 * 1024 // 2 MB

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PortalProfile() {
  const [profile, setProfile] = useState(null)
  const [resume, setResume] = useState(null)
  const [form, setForm] = useState({ phone: '', skills: '' })
  const [pass, setPass] = useState({ current_password: '', new_password: '' })
  const [message, setMessage] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef(null)

  async function load() {
    setLoadError('')
    try {
      const [d, metadata] = await Promise.all([api.portal.summary(), api.portal.resume()])
      if (!d.profile) throw new Error('Could not load your profile.')
      setProfile(d.profile)
      setResume(metadata.resume ?? d.profile.resume ?? null)
      setForm({ phone: d.profile.phone || '', skills: (d.profile.skills || []).join(', ') })
    } catch (err) {
      setLoadError(err.message || 'Could not load your profile.')
    }
  }

  useEffect(() => { load() }, [])

  async function saveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    setMessage(null)
    try {
      const p = await api.portal.profile({ phone: form.phone, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) })
      setProfile(p.profile)
      setMessage({ kind: 'success', text: 'Profile updated.' })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setSavingPassword(true)
    setMessage(null)
    try {
      await api.changePassword(pass)
      setPass({ current_password: '', new_password: '' })
      setMessage({ kind: 'success', text: 'Password changed.' })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setSavingPassword(false)
    }
  }

  function handleFileChange(e) {
    setFileError('')
    const file = e.target.files?.[0]
    // allow re-picking the same file after a failed attempt
    e.target.value = ''
    if (!file) return
    if (uploading || deleting) return
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setFileError('Only PDF files are accepted.')
      return
    }
    if (file.size === 0) {
      setFileError('That file is empty.')
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      setFileError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). The limit is 2 MB.`)
      return
    }
    if (resume && !window.confirm(`Replace ${resume.filename} with ${file.name}? The current resume will be removed.`)) return
    uploadResume(file)
  }

  async function uploadResume(file) {
    setUploading(true)
    setMessage(null)
    try {
      const data = new FormData()
      data.append('file', file)
      const d = await api.portal.uploadResume(data)
      setResume(d.resume || null)
      setMessage({ kind: 'success', text: 'Resume uploaded.' })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setUploading(false)
    }
  }

  async function removeResume() {
    setDeleting(true)
    setMessage(null)
    try {
      await api.portal.deleteResume()
      setResume(null)
      setConfirmRemove(false)
      setMessage({ kind: 'success', text: 'Resume removed.' })
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    } finally {
      setDeleting(false)
    }
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="page-title font-display text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Profile</h1>
        <Alert kind="danger">{loadError} <button onClick={load} className="underline underline-offset-4">Retry</button></Alert>
      </div>
    )
  }

  if (!profile) return <p className="py-24 text-center text-ink-low">Loading…</p>

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="text-[12px] leading-none text-ink-low">{profile.roll_no} · {profile.department}</p>
        <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Profile</h1>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {fileError && <Alert kind="danger" onClose={() => setFileError('')}>{fileError}</Alert>}

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
              <div className="mt-1 text-sm font-semibold text-ink-hi">{profile.cgpa != null ? profile.cgpa.toFixed(2) : '—'}</div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-3">
            <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Skills (comma-sep)"><input className={inputClass} placeholder="Python, SQL, React" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
            <PrimaryButton type="submit" disabled={savingProfile}>
              <span>{savingProfile ? 'Saving…' : 'Save profile'}</span>
            </PrimaryButton>
          </form>
        </Card>

        <div className="space-y-4">
          {/* resume card */}
          <Card className="p-5">
            <h2 className="font-display mb-4 text-[15px] font-bold leading-none text-ink-hi">Resume</h2>
            {resume ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-raise p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink-hi">{resume.filename}</div>
                    <div className="mt-0.5 text-[11px] text-ink-low">
                      {formatBytes(resume.size)} · uploaded {formatDate(resume.updated_at)}
                    </div>
                  </div>
                  <a
                    href={api.portal.resumeUrl()}
                    className="shrink-0 rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-hi transition-colors duration-300 hover:border-ink-low"
                    download
                  >
                    Download
                  </a>
                </div>

                {confirmRemove ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2.5">
                    <span className="text-xs text-ink-hi">Remove this resume? Recruiters will no longer see it.</span>
                    <span className="flex shrink-0 gap-2">
                      <button onClick={removeResume} disabled={deleting} className="rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white transition-opacity duration-300 disabled:opacity-50">
                        {deleting ? 'Removing…' : 'Yes, remove'}
                      </button>
                      <button onClick={() => setConfirmRemove(false)} disabled={deleting} className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-hi disabled:opacity-50">
                        Cancel
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading || deleting}>
                      {uploading ? 'Uploading…' : 'Replace file'}
                    </button>
                    <input ref={fileInputRef} type="file" aria-label="Replace resume PDF" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} disabled={uploading || deleting} />
                    <button
                      onClick={() => setConfirmRemove(true)}
                      disabled={uploading || deleting}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-coral underline-offset-4 transition-colors duration-300 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                    <span className="text-[11px] text-ink-low">PDF only · max 2 MB</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-mid">No resume on file. Upload yours so the placement cell can share it with recruiters.</p>
                <button type="button" className="btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading || deleting}>
                  {uploading ? 'Uploading…' : 'Upload PDF'}
                </button>
                <input ref={fileInputRef} type="file" aria-label="Upload resume PDF" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} disabled={uploading || deleting} />
                <p className="text-[11px] text-ink-low">PDF only · max 2 MB</p>
              </div>
            )}
          </Card>

          {/* password card */}
          <Card className="p-5">
            <h2 className="font-display mb-4 text-[15px] font-bold leading-none text-ink-hi">Change password</h2>
            <form onSubmit={changePassword} className="space-y-3">
              <Field label="Current password"><input type="password" className={inputClass} value={pass.current_password} onChange={(e) => setPass({ ...pass, current_password: e.target.value })} required /></Field>
              <Field label="New password"><input type="password" className={inputClass} value={pass.new_password} onChange={(e) => setPass({ ...pass, new_password: e.target.value })} required /></Field>
              <PrimaryButton type="submit" disabled={savingPassword}>
                <span>{savingPassword ? 'Updating…' : 'Update password'}</span>
              </PrimaryButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
