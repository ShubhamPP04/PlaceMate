import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Logo from './Logo'
import { ThemeToggle } from './Theme.jsx'

const ADMIN_RAIL = [
  { to: '/dashboard', label: 'Home', short: 'Home', dots: true },
  { to: '/students', label: 'Students', short: 'Students' },
  { to: '/companies', label: 'Companies', short: 'Firms' },
  { to: '/drives', label: 'Drives', short: 'Drives' },
  { to: '/applications', label: 'Applications', short: 'Apps' },
  { to: '/notices', label: 'Notices', short: 'News' },
]

const STUDENT_RAIL = [
  { to: '/portal', label: 'Home', short: 'Home', dots: true },
  { to: '/portal/drives', label: 'Drives', short: 'Drives' },
  { to: '/portal/applications', label: 'Applications', short: 'Apps' },
  { to: '/portal/profile', label: 'Profile', short: 'You' },
]

const RAIL_ICONS = {
  '/students': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  '/companies': 'M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M9 13h.01M15 10h.01M15 13h.01',
  '/drives': 'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  '/applications': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6',
  '/notices': 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  '/portal': 'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4h2v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10',
  '/portal/drives': 'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  '/portal/applications': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6',
  '/portal/profile': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}

function RailIcon({ to, dots }) {
  if (dots) {
    return (
      <span className="grid grid-cols-2 gap-[3px]">
        {[0, 1, 2, 3].map((i) => <span key={i} className="h-[5px] w-[5px] rounded-full bg-current" />)}
      </span>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
      <path d={RAIL_ICONS[to]} />
    </svg>
  )
}

function StudentRecent() {
  const navigate = useNavigate()
  const location = useLocation()
  const [apps, setApps] = useState([])
  useEffect(() => {
    let cancelled = false
    api.portal.applications().then((d) => { if (!cancelled) setApps(d.applications || []) }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  if (!apps.length) {
    return <p className="px-3 py-6 text-center text-[11px] text-ink-low">No applications yet.</p>
  }
  return (
    <div className="space-y-0.5">
      {apps.slice(0, 6).map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => navigate('/portal/applications')}
          className={'msg-row w-full text-left' + (location.pathname === '/portal/applications' ? ' active' : '')}
        >
          <Logo name={a.company_name} size={36} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink-hi">{a.company_name}</p>
            <p className="truncate text-[11px] text-ink-low">{a.role} · {a.status}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

export default function Layout({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [recent, setRecent] = useState([])
  const isStudent = user?.role === 'student'
  const rail = isStudent ? STUDENT_RAIL : ADMIN_RAIL
  const home = isStudent ? '/portal' : '/dashboard'

  useEffect(() => {
    if (isStudent) return
    let cancelled = false
    Promise.all([api.drives(), api.applications()])
      .then(([d, a]) => {
        if (cancelled) return
        const drives = (d.drives || []).map((dr) => ({
          key: 'd' + dr.id,
          name: dr.company_name,
          website: dr.company_website,
          sub: dr.title,
          to: `/drives/${dr.id}`,
          sort: (dr.drive_date || '1970-01-01') + 'D',
        }))
        const apps = (a.applications || []).map((ap) => ({
          key: 'a' + ap.id,
          name: ap.company_name,
          website: ap.company_website,
          sub: `${ap.student_name} · ${ap.status}`,
          to: `/applications/${ap.id}`,
          sort: (ap.applied_at || '') + 'A',
        }))
        setRecent([...drives, ...apps].sort((x, y) => y.sort.localeCompare(x.sort)).slice(0, 6))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isStudent])

  // Scroll main pane to top on route change (mobile + desktop).
  useEffect(() => {
    const el = document.getElementById('pm-main')
    if (el) el.scrollTop = 0
  }, [location.pathname])

  async function handleLogout() {
    await onLogout()
    navigate('/login')
  }

  return (
    <div className="relative min-h-[100dvh] md:py-6 md:sm:py-8">
      <div className="stage-stripes" aria-hidden="true" />

      <div className="arc-shell mobile-shell grid h-[100dvh] grid-cols-1 overflow-hidden md:h-[calc(100dvh-64px)] md:grid-cols-[64px_1fr] lg:grid-cols-[64px_280px_1fr]">
        {/* ── desktop icon rail ── */}
        <aside className="rail hidden h-full md:flex">
          <NavLink to={home} className="rail-btn !h-auto !w-auto bg-transparent shadow-none">
            <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-black text-[14px] font-black tracking-tighter text-lime">
              PM
            </span>
          </NavLink>

          <div className="mt-5 flex flex-col gap-2">
            {rail.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === home}
                title={item.label}
                className={({ isActive }) => 'rail-btn' + (isActive ? ' active' : '')}
              >
                <RailIcon to={item.to} dots={item.dots} />
              </NavLink>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <ThemeToggle className="rail-btn !h-[42px] !w-[42px] !rounded-full border !border-hairline !bg-transparent" />
            <button onClick={handleLogout} title="Logout" className="rail-btn exit" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                <path d="M15 12H3M7 8l-4 4 4 4M13 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
              </svg>
            </button>
          </div>
        </aside>

        {/* ── desktop messages sidebar ── */}
        <aside className="hidden flex-col border-r border-hairline bg-panel lg:flex">
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-sm text-ink-low">Welcome to</p>
            <h1 className="font-display mb-6 mt-0.5 text-[28px] font-extrabold leading-none tracking-tight text-ink-hi">
              PlaceMate
            </h1>

            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink-hi">{isStudent ? 'Your applications' : 'Recent'}</h3>
              {!isStudent && (
                <button
                  type="button"
                  title="Add company"
                  onClick={() => navigate('/companies')}
                  className="icon-btn text-sm leading-none"
                >
                  +
                </button>
              )}
            </div>

            {isStudent ? (
              <StudentRecent />
            ) : (
              <div className="space-y-0.5">
                {recent.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => navigate(m.to)}
                    className={'msg-row w-full text-left' + (location.pathname === m.to ? ' active' : '')}
                  >
                    <Logo website={m.website} name={m.name} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink-hi">{m.name}</p>
                      <p className="truncate text-[11px] text-ink-low">{m.sub}</p>
                    </div>
                  </button>
                ))}
                {!recent.length && (
                  <p className="px-3 py-6 text-center text-[11px] text-ink-low">No recent activity.</p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-hairline p-4">
            <div className="flex items-center gap-3 rounded-xl border border-hairline bg-raise px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green to-lime text-[11px] font-bold text-black">
                {(user?.name || 'A').slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[12px] font-semibold leading-none text-ink-hi">{user?.name}</p>
                <p className="mt-1 truncate text-[10px] capitalize leading-none text-ink-low">{user?.role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── main column (mobile top bar + scroll + bottom tabs) ── */}
        <div className="flex min-h-0 min-w-0 flex-col bg-panel-2/60">
          <header className="mobile-topbar md:hidden">
            <NavLink to={home} className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black text-[12px] font-black tracking-tighter text-lime">
                PM
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[15px] font-extrabold tracking-tight text-ink-hi">PlaceMate</p>
                <p className="truncate text-[10px] capitalize text-ink-low">{user?.name}</p>
              </div>
            </NavLink>
            <div className="flex items-center gap-1.5">
              <ThemeToggle className="rail-btn !h-10 !w-10 !rounded-full border !border-hairline !bg-transparent" />
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="rail-btn exit !h-10 !w-10"
                aria-label="Log out"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                  <path d="M15 12H3M7 8l-4 4 4 4M13 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                </svg>
              </button>
            </div>
          </header>

          <main id="pm-main" className="mobile-main min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5 md:p-7">
            <Outlet />
          </main>

          <nav className="mobile-tabbar md:hidden" aria-label="Primary">
            {rail.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === home}
                className={({ isActive }) => 'mobile-tab' + (isActive ? ' active' : '')}
              >
                <span className="mobile-tab-icon">
                  <RailIcon to={item.to} dots={item.dots} />
                </span>
                <span className="mobile-tab-label">{item.short || item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
