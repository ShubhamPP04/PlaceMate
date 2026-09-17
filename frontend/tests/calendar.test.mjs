import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = (await readFile(new URL('../src/calendar.js', import.meta.url), 'utf8'))
const { dateKey, monthGrid, driveEvents } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('dateKey uses local date parts with zero padding', () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05')
})

test('monthGrid starts on Monday, pads, and trims to whole weeks', () => {
  const grid = monthGrid(new Date(2026, 8, 1)) // September 2026 starts on a Tuesday
  assert.equal(grid.length, 35)
  assert.equal(grid[0], null)
  assert.equal(dateKey(grid[6]), '2026-09-06')
  assert.equal(grid.at(-1), null)
  assert.equal(grid.filter(Boolean).length, 30)
  const september = monthGrid(new Date(2026, 1, 1))
  assert.ok(september.includes(null))
})

test('driveEvents bucket drive and deadline events by date without mutating input', () => {
  const drives = [
    { id: 1, drive_date: '2026-10-12', application_deadline: '2026-10-05' },
    { id: 2, drive_date: '2026-10-12', application_deadline: null },
  ]
  const events = driveEvents(drives)
  assert.deepEqual(Object.keys(events).sort(), ['2026-10-05', '2026-10-12'])
  assert.equal(events['2026-10-12'].length, 2)
  assert.equal(events['2026-10-12'][0].label, 'Drive')
  assert.equal(drives[0].drive_date, '2026-10-12')
})
