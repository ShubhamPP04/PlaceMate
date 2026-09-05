import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ThemeToggle } from '../components/Theme.jsx'

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { user } = await api.login(email, password)
      onLogin(user)
      navigate(user.role === 'student' ? '/portal' : '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative grid min-h-[100dvh] place-items-center px-4 py-10" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))', paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
      <div className="stage-aurora" aria-hidden="true"><span /><span /><span /><span /></div>

      <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        <ThemeToggle />
      </div>

      <div className="relative z-[1] w-full max-w-md">
        {/* editorial split: wordmark block above the bezel card */}
        <div className="rise mb-8 text-center">
          <span
            className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-black text-lg font-black tracking-tighter text-lime shadow-[0_14px_40px_-12px_rgba(0,0,0,0.8)]"
          >
            PM
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-ink-hi">
            PlaceMate
          </h1>
          <p className="mt-2 text-sm text-ink-mid">Placement cell intelligence, beautifully distilled.</p>
        </div>

        {error && (
          <div className="rise mb-4 rounded-2xl border border-coral/25 bg-coral/10 px-5 py-3.5 text-sm text-coral">
            {error}
          </div>
        )}

        <div className="rise rise-d1 liquid-glass liquid-glass--hero p-0">
          <form onSubmit={handleSubmit} className="relative z-[2] space-y-5 p-7">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-low">Email</span>
              <div className="field-shell">
                <input
                  className="field-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-low">Password</span>
              <div className="field-shell">
                <input
                  className="field-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
              <span>{busy ? 'Signing in…' : 'Sign in'}</span>
              <span className="btn-icon-wrap">→</span>
            </button>

            <p className="pt-1 text-center text-[11px] text-ink-low">
              Admin · admin@placemate.edu / admin123 &nbsp;·&nbsp; Student · roll&nbsp;no built from profile
            </p>
          </form>
        </div>

        <p className="rise rise-d2 mt-8 text-center text-[11px] uppercase tracking-[0.22em] text-ink-low">
          Placement Cell Management
        </p>
      </div>
    </div>
  )
}
