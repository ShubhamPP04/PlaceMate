/* Shared UI primitives — Arcedia edition */

export function Card({ className = '', lime = false, lift = true, children, ...rest }) {
  return (
    <div className={`arc-card ${lime ? 'arc-lime' : ''} ${lift ? 'arc-card-lift' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, live = false }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-raise px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mid">
      {live && <span className="h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_8px_var(--green)]" />}
      {children}
    </span>
  )
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-[15px] font-bold tracking-tight text-ink-hi">{children}</h2>
      {sub && <p className="mt-0.5 text-xs text-ink-low">{sub}</p>}
    </div>
  )
}

const PILLS = {
  unplaced: 'pill-unplaced',
  applied: 'pill-applied',
  shortlisted: 'pill-shortlisted',
  selected: 'pill-selected',
  rejected: 'pill-rejected',
}

export function StatusPill({ status }) {
  return <span className={`pill ${PILLS[status] || PILLS.unplaced}`}>{status}</span>
}

/** Marks an application/shortlist as outside the drive's eligibility rules. */
export function EligibilityPill({ reason }) {
  return (
    <span title={reason} className="pill pill-rejected cursor-help">Ineligible</span>
  )
}

export function PrimaryButton({ children, className = '', ...rest }) {
  return (
    <button className={`btn-primary ${className}`} {...rest}>
      <span>{children}</span>
    </button>
  )
}

export function GhostButton({ className = '', ...rest }) {
  return <button className={`btn-ghost ${className}`} {...rest} />
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-low">{label}</span>
      <div className="field-shell">{children}</div>
    </label>
  )
}

export const inputClass = 'field-input'

export function Alert({ kind = 'info', children, onClose }) {
  const dot = { success: 'bg-green', danger: 'bg-coral', info: 'bg-ink-mid' }[kind]
  return (
    <div className="rise arc-card" style={{ lift: false }}>
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3 text-sm text-ink-hi">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {children}
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-ink-low transition-colors duration-300 hover:text-ink-hi" aria-label="Dismiss">✕</button>
        )}
      </div>
    </div>
  )
}

