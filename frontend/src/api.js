const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Local Vite proxies /api → Flask. On Vercel set VITE_API_URL to the API origin.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, { credentials: 'include', ...options })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  changePassword: (body) => request('/auth/password', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }),

  dashboard: () => request('/admin/dashboard'),
  students: (params = '') => request(`/admin/students${params}`),
  addStudent: (body) => request('/admin/students', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  updateStudent: (id, body) => request(`/admin/students/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  deleteStudent: (id) => request(`/admin/students/${id}`, { method: 'DELETE' }),
  resetStudentPassword: (id) => request(`/admin/students/${id}/reset-password`, { method: 'POST' }),
  importStudents: (formData) => {
    // fetch wrapper reads JSON; file upload needs no Content-Type header
    return request('/admin/students/import', { method: 'POST', body: formData })
  },

  companies: (params = '') => request(`/admin/companies${params}`),
  company: (id) => request(`/admin/companies/${id}`),
  addCompany: (body) => request('/admin/companies', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  updateCompany: (id, body) => request(`/admin/companies/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  deleteCompany: (id) => request(`/admin/companies/${id}`, { method: 'DELETE' }),

  drives: (params = '') => request(`/admin/drives${params}`),
  drive: (id) => request(`/admin/drives/${id}`),
  addDrive: (body) => request('/admin/drives', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  updateDrive: (id, body) => request(`/admin/drives/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  toggleDrive: (id) => request(`/admin/drives/${id}/toggle`, { method: 'POST' }),
  driveTargets: (id) => request(`/admin/drives/${id}/targets`),

  applications: (params = '') => request(`/admin/applications${params}`),
  application: (id) => request(`/admin/applications/${id}`),
  setApplicationStatus: (id, status) =>
    request(`/admin/applications/${id}/status`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ status }) }),

  notices: () => request('/admin/notices'),
  addNotice: (body) => request('/admin/notices', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  deleteNotice: (id) => request(`/admin/notices/${id}`, { method: 'DELETE' }),

  exportUrl: (entity) => `${API_BASE}/api/admin/export/${entity}`,

  portal: {
    summary: () => request('/portal/summary'),
    drives: () => request('/portal/drives'),
    apply: (id) => request(`/portal/drives/${id}/apply`, { method: 'POST' }),
    applications: () => request('/portal/applications'),
    profile: (body) => request('/portal/profile', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) }),
    notices: () => request('/portal/notices'),
  },
}
