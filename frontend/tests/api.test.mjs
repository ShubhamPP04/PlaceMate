import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = (await readFile(new URL('../src/api.js', import.meta.url), 'utf8')).replace('import.meta.env.VITE_API_URL', "''")
const { api } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
let stored = new Map()
globalThis.sessionStorage = { getItem: (key) => stored.get(key), removeItem: (key) => stored.delete(key), setItem: (key, value) => stored.set(key, value) }

test('exports encode applied filters and omit empty values', () => {
  assert.equal(api.exportUrl('students', { q: 'A & B', dept: 'CSE', status: '', program: null }), '/api/admin/export/students?q=A+%26+B&dept=CSE')
})

test('logout retains authentication marker on failure and removes it on success', async () => {
  stored.set('pm-authed', '1')
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: 'Offline' }) })
  await assert.rejects(api.logout(), /Offline/)
  assert.equal(stored.get('pm-authed'), '1')
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/logout')
    assert.equal(options.credentials, 'include')
    assert.equal(options.method, 'POST')
    return { ok: true, status: 200, json: async () => ({ ok: true }) }
  }
  await api.logout()
  assert.equal(stored.has('pm-authed'), false)
})

test('status update sends optional note', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/admin/applications/7/status')
    assert.deepEqual(JSON.parse(options.body), { status: 'shortlisted', note: 'Panel reviewed' })
    return { ok: true, status: 200, json: async () => ({}) }
  }
  await api.setApplicationStatus(7, 'shortlisted', 'Panel reviewed')
})

test('resume upload preserves multipart content type boundary', async () => {
  const form = new FormData()
  form.append('file', new Blob(['pdf']), 'resume.pdf')
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/portal/resume')
    assert.equal(options.body, form)
    assert.equal(options.headers, undefined)
    assert.equal(options.credentials, 'include')
    return { ok: true, status: 200, json: async () => ({ resume: {} }) }
  }
  await api.portal.uploadResume(form)
})
