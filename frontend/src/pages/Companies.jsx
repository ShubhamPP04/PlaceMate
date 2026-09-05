import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Card, Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'

const EMPTY = { name: '', industry: '', website: '', hr_email: '' }

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [filters, setFilters] = useState({ q: '' })
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)

  const load = useCallback(async (f = filters) => {
    const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
    const data = await api.companies(params ? `?${params}` : '')
    setCompanies(data.companies)
  }, [filters])
  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [load])

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true); setMessage(null) }
  function openEdit(c) { setEditing(c.id); setForm(c); setShowForm(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editing) {
        await api.updateCompany(editing, form)
        setMessage({ kind: 'success', text: 'Company updated.' })
      } else {
        await api.addCompany(form)
        setMessage({ kind: 'success', text: 'Company added.' })
      }
      setForm(EMPTY); setEditing(null); setShowForm(false)
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Remove ${c.name} and its drives?`)) return
    try {
      await api.deleteCompany(c.id)
      setMessage({ kind: 'info', text: `${c.name} removed.` })
      load()
    } catch (err) {
      setMessage({ kind: 'danger', text: err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col items-start gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] leading-none text-ink-low">{companies.length} partners</p>
          <h1 className="page-title font-display mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-ink-hi">Companies</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={api.exportUrl('companies')} className="btn-ghost">Export CSV</a>
          {showForm
            ? <GhostButton onClick={() => { setShowForm(false); setEditing(null) }}>Close</GhostButton>
            : <PrimaryButton onClick={openCreate}>Add company</PrimaryButton>}
        </div>
      </div>

      {message && <Alert kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {showForm && (
        <div className="rise">
          <Card className="p-0">
            <form onSubmit={handleSubmit} className="grid gap-4 p-5 md:grid-cols-4">
              <Field label="Name *"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
              <Field label="Industry"><input className={inputClass} placeholder="IT Services" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></Field>
              <Field label="Website"><input type="url" className={inputClass} placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
              <Field label="HR Email"><input type="email" className={inputClass} value={form.hr_email} onChange={(e) => setForm({ ...form, hr_email: e.target.value })} /></Field>
              <div className="md:col-span-4">
                <PrimaryButton type="submit">{editing ? 'Save changes' : 'Save company'}</PrimaryButton>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="rise rise-d1">
        <Card className="p-0">
          <div className="p-5 pb-0">
            <div className="mb-3 grid gap-2.5 md:grid-cols-3">
              <div className="field-shell md:col-span-1">
                <input
                  className={inputClass}
                  placeholder="Search companies…"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                />
              </div>
              <GhostButton className="justify-self-start" onClick={() => load()}>Apply</GhostButton>
            </div>
          </div>
          <div className="mobile-list flex md:hidden">
            {companies.map((c) => (
              <div key={c.id} className="mobile-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink-hi">{c.name}</p>
                    <p className="mt-0.5 text-[12px] text-ink-mid">{c.industry || '—'}</p>
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-[11px] text-green">
                        {c.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {c.hr_email && <p className="mt-0.5 truncate text-[11px] text-ink-low">{c.hr_email}</p>}
                  </div>
                  <span className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] tabular-nums text-ink-mid">
                    {c.drives_count} drives
                  </span>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => openEdit(c)} className="rounded-full border border-hairline px-3 py-1.5 text-[11px] text-ink-mid active:scale-[0.98]">Edit</button>
                  <button type="button" onClick={() => handleDelete(c)} className="rounded-full border border-coral/25 px-3 py-1.5 text-[11px] text-coral active:scale-[0.98]">Remove</button>
                </div>
              </div>
            ))}
            {!companies.length && <p className="py-8 text-center text-sm text-ink-low">No companies match.</p>}
          </div>

          <div className="hidden overflow-x-auto px-5 pb-5 md:block">
            <table className="tbl w-full">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[15%]" />
                <col className="w-[24%]" />
                <col className="w-[22%]" />
                <col className="w-[7%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-ink-low">
                  <th className="px-2 pb-3 font-medium">Company</th>
                  <th className="px-2 pb-3 font-medium">Industry</th>
                  <th className="px-2 pb-3 font-medium">Website</th>
                  <th className="px-2 pb-3 font-medium">HR Email</th>
                  <th className="px-2 pb-3 text-right font-medium">Drives</th>
                  <th className="px-2 pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="table-row border-t border-hairline">
                    <td className="px-2 py-3 font-medium text-ink-hi">{c.name}</td>
                    <td className="px-2 py-3 text-ink-mid">{c.industry || '—'}</td>
                    <td className="px-2 py-3">
                      {c.website
                        ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-green transition-opacity duration-300 hover:opacity-70">{c.website}</a>
                        : <span className="text-ink-low">—</span>}
                    </td>
                    <td className="px-2 py-3 text-ink-mid">{c.hr_email || '—'}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-ink-mid">{c.drives_count}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="rounded-full border border-hairline px-3 py-1 text-[11px] text-ink-mid transition-all duration-500 hover:bg-raise active:scale-[0.98]">Edit</button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="rounded-full border border-coral/25 px-3 py-1 text-[11px] text-coral transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-coral/10 active:scale-[0.98]"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!companies.length && (
                  <tr><td colSpan="6" className="py-10 text-center text-ink-low">No companies match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
