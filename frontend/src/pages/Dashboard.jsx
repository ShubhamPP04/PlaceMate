import { useEffect, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../api'

function useChartTheme() {
  const [t, setT] = useState({})
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement)
      const v = (n) => cs.getPropertyValue(n).trim()
      setT({
        trend: v('--chart-trend') || '#2dd4bf',
        c1: v('--chart-1') || '#38bdf8',
        c2: v('--chart-2') || '#6366f1',
        c3: v('--chart-3') || '#2dd4bf',
        dept: v('--chart-dept') || '#818cf8',
        mute: v('--chart-mute') || 'rgba(255,255,255,0.14)',
        green: v('--green') || '#22c55e',
        metric: v('--metric') || '#d3ef4c',
        amber: v('--amber') || '#d9a13b',
        coral: v('--coral') || '#f87171',
        inkLow: v('--ink-low') || '#eceef2',
        card: v('--card') || '#141619',
        hairline: v('--hairline') || 'rgba(255,255,255,0.08)',
        inkHi: v('--ink-hi') || '#ffffff',
        dark: document.documentElement.dataset.theme !== 'light',
      })
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return t
}

/* one card header — identical baseline on every chart card */
function CardHead({ title, tag }) {
  return (
    <div className="mb-4 flex h-8 items-center justify-between">
      <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">{title}</h2>
      {tag && <span className="text-[11px] leading-none text-ink-low">{tag}</span>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const T = useChartTheme()
  const AXIS = { fill: T.inkHi, fontSize: 11 }
  const TOOLTIP = {
    backgroundColor: T.dark ? 'rgba(12, 24, 20, 0.96)' : 'rgba(255,255,255,0.96)',
    border: '1px solid ' + (T.hairline || 'rgba(255,255,255,0.16)'),
    borderRadius: 12,
    fontSize: 13, padding: '8px 12px', color: T.dark ? '#ffffff' : T.inkHi,
  }
  /* identical chart insets everywhere: roomy bottom for X labels */
  const INSET = { left: -18, right: 8, top: 6, bottom: 4 }

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-coral">{error}</p>
  if (!data || !T.green) return <p className="py-24 text-center text-ink-low">Loading…</p>

  const { stats, charts, dept_stats: deptStats } = data
  const funnel = charts.appFunnel.labels.map((l, i) => ({
    name: l, value: charts.appFunnel.values[i],
    fill: [T.c1, T.c2, T.c3, T.coral][i],
  }))
  const skills = charts.topSkills.labels.map((l, i) => ({ name: l, value: charts.topSkills.values[i] }))
  const trend = charts.monthlyApps.labels.map((l, i) => ({ month: l, apps: charts.monthlyApps.values[i] }))
  const deptRate = charts.deptPlacement.labels.map((l, i) => ({ name: l, pct: charts.deptPlacement.values[i] }))

  const CARDS = [
    { label: 'Active drives', value: stats.active_drives, sub: 'across the season' },
    { label: 'Applications', value: stats.applications, delta: stats.deltas?.applications, sub: stats.highest_package ? `Top package ${stats.highest_package.toFixed(1)} LPA` : 'no offers yet' },
    { label: 'Selected', value: stats.selected, sub: stats.avg_package_overall ? `Avg package ${stats.avg_package_overall.toFixed(1)} LPA` : 'avg package —' },
  ]

  return (
    <div className="space-y-4">
      {/* header — fixed height row */}
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">Overview</p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">
            Placement Overview
          </h1>
        </div>
        <span className="inline-flex h-8 items-center gap-2 rounded-full border border-hairline bg-raise px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-mid">
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          Season 2026 · Live
        </span>
      </div>

      {/* ── KPI row: identical card anatomy, equal heights ── */}
      <div className="rise rise-d1 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <div className="arc-card arc-lime flex h-full min-h-[120px] flex-col justify-between p-4 sm:min-h-[132px] sm:p-5">
          <p className="text-[11px] font-bold uppercase leading-none tracking-wide opacity-70">Placement rate</p>
          <p className="kpi-num font-display text-[40px] font-extrabold leading-none tabular-nums">
            {stats.placement_pct}<span className="text-[22px] align-top">%</span>
          </p>
          <p className="text-[11px] font-semibold leading-none opacity-70">{stats.selected} of {stats.total_students} placed · {stats.unplaced} unplaced</p>
        </div>
        {CARDS.map((s) => (
          <div key={s.label} className="arc-card flex h-full min-h-[120px] flex-col justify-between p-4 sm:min-h-[132px] sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase leading-none tracking-wide text-ink-low">{s.label}</p>
              <span className="pill pill-applied leading-none">{s.delta != null ? (s.delta < 0 ? '↓ ' : '↑ ') + Math.abs(s.delta) + '%' : 'live'}</span>
            </div>
            <p className="kpi-num font-display text-[40px] font-extrabold leading-none tabular-nums text-ink-hi">{s.value}</p>
            <p className="text-[11px] leading-none text-ink-low">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── row 2: momentum + funnel — equal heights via items-stretch ── */}
      <div className="rise rise-d2 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-5">
        <div className="arc-card p-5 xl:col-span-3">
          <CardHead title="Momentum" tag="applications / month" />
          <ResponsiveContainer width="100%" height={236}>
            <AreaChart data={trend} margin={INSET}>
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.trend} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={T.trend} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke={T.hairline} vertical={false} />
              <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ stroke: T.hairline }} />
              <Area type="monotone" dataKey="apps" stroke={T.trend} strokeWidth={2.5} fill="url(#tg)" dot={false} activeDot={{ r: 5, fill: T.trend }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="arc-card p-5 xl:col-span-2">
          <CardHead title="Funnel" tag="candidate stages" />
          <ResponsiveContainer width="100%" height={236}>
            <BarChart data={funnel} margin={INSET}>
              <CartesianGrid strokeDasharray="2 6" stroke={T.hairline} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: T.hairline }} />
              <Bar dataKey="value" radius={[8, 8, 2, 2]} maxBarSize={48} barCategoryGap="28%">
                {funnel.map((f) => <Cell key={f.name} fill={f.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── row 3: skills + dept + conversion — 3-up, equal heights, aligned content ── */}
      <div className="rise rise-d3 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <div className="arc-card flex flex-col p-5">
          <CardHead title="Skill demand" tag="shortlisted talent" />
          {skills.length ? (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={skills} layout="vertical" margin={{ left: 4, right: 12, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke={T.hairline} horizontal={false} />
                <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={84} tick={AXIS} axisLine={false} tickLine={false} tickMargin={0} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: T.hairline }} />
                <Bar dataKey="value" fill={T.c1} radius={[0, 6, 6, 0]} maxBarSize={16} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-16 text-center text-sm text-ink-low">No shortlisted applications yet.</p>}
        </div>

        <div className="arc-card flex flex-col p-5">
          <CardHead title="Dept placement" tag="% selected" />
          <ResponsiveContainer width="100%" height={224}>
            <BarChart data={deptRate} margin={INSET}>
              <CartesianGrid strokeDasharray="2 6" stroke={T.hairline} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: T.hairline }} />
              <Bar dataKey="pct" fill={T.dept} radius={[8, 8, 2, 2]} maxBarSize={40} minBarSize={3} barCategoryGap="28%" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* conversion — donut centered in the chart gutter, legend docked to bottom */}
        <div className="arc-card flex flex-col p-5">
          <CardHead title="Conversion" tag="offer rate" />
          <div className="relative mx-auto h-[224px] w-[224px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Selected', value: stats.selected },
                    { name: 'Shortlisted', value: stats.shortlisted },
                    { name: 'Unplaced', value: Math.max(stats.total_students - stats.selected - stats.shortlisted, 0) },
                  ]}
                  dataKey="value" innerRadius={72} outerRadius={98} cornerRadius={9}
                  paddingAngle={3} strokeWidth={0} startAngle={90} endAngle={-270} cx="50%" cy="50%"
                >
                  <Cell fill={T.c3} />
                  <Cell fill={T.c2} />
                  <Cell fill={T.mute} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* center stat — placement % */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-extrabold leading-none tabular-nums text-ink-hi">
                {stats.placement_pct}<span className="text-sm align-top">%</span>
              </span>
              <span className="mt-1 text-[9px] uppercase tracking-[0.14em] text-ink-low">placed</span>
            </div>
          </div>
          <div className="mt-auto w-full space-y-2 border-t border-hairline pt-3 text-xs">
            <p className="flex h-4 items-center justify-between"><span className="text-ink-low">Selected</span><strong className="font-semibold text-ink-hi">{stats.selected}</strong></p>
            <p className="flex h-4 items-center justify-between"><span className="text-ink-low">Shortlisted</span><strong className="font-semibold text-ink-hi">{stats.shortlisted}</strong></p>
            <p className="flex h-4 items-center justify-between"><span className="text-ink-low">Unplaced</span><strong className="font-semibold text-ink-hi">{Math.max(stats.total_students - stats.shortlisted - stats.selected, 0)}</strong></p>
          </div>
        </div>
      </div>

      {/* ── dept table ── */}
      <div className="rise rise-d4 arc-card overflow-hidden">
        <div className="flex h-8 items-center justify-between px-5 pt-5">
          <h2 className="font-display text-[15px] font-bold leading-none text-ink-hi">Department statistics</h2>
          <span className="text-[11px] leading-none text-ink-low">{deptStats.length} departments</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="tbl w-full">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-ink-low">
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Students</th>
                <th className="px-5 py-3 font-semibold">Avg CGPA</th>
                <th className="px-5 py-3 font-semibold">Selected</th>
                <th className="px-5 py-3 font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {deptStats.map((d) => (
                <tr key={d.department} className="table-row border-b border-hairline/60 last:border-0">
                  <td className="px-5 py-3 font-semibold text-ink-hi">{d.department}</td>
                  <td className="px-5 py-3 text-ink-mid">{d.total}</td>
                  <td className="px-5 py-3 text-ink-mid">{d.avg_cgpa}</td>
                  <td className="px-5 py-3 text-ink-mid">{d.selected}</td>
                  <td className="px-5 py-3"><span className="pill pill-applied">{d.pct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

