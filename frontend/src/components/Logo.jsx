import { useState } from 'react'

const PALETTE = ['#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#6366f1']

function colorFor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase()
}

function faviconUrl(website) {
  if (!website) return null
  try {
    const host = new URL(website).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
  } catch {
    return null
  }
}

/**
 * Company logo with graceful fallback.
 * - `website`: company URL → fetches the real favicon via Google's service
 * - `name`: used for the colored-initials fallback and the alt text
 * - `size`: pixel size of the square avatar (default 36)
 */
export default function Logo({ website, name, size = 36, className = '' }) {
  const [failed, setFailed] = useState(false)
  const src = faviconUrl(website)
  const showImg = src && !failed
  const dim = { width: size, height: size }

  if (showImg) {
    return (
      <span
        className={'grid shrink-0 place-items-center overflow-hidden rounded-full bg-raise ' + className}
        style={dim}
      >
        <img
          src={src}
          alt={name || ''}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    )
  }

  return (
    <span
      className={'grid shrink-0 place-items-center rounded-full font-bold text-white ' + className}
      style={{ ...dim, background: colorFor(name) }}
    >
      <span style={{ fontSize: Math.round(size * 0.3) }}>{initials(name)}</span>
    </span>
  )
}
