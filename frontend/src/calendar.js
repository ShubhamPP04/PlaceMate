export const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function monthGrid(month) {
  const year = month.getFullYear()
  const index = month.getMonth()
  const offset = (new Date(year, index, 1).getDay() + 6) % 7
  const days = new Date(year, index + 1, 0).getDate()
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, cell) => {
    const day = cell - offset + 1
    return day < 1 || day > days ? null : new Date(year, index, day)
  })
}

export function driveEvents(drives) {
  const events = {}
  for (const drive of drives) {
    for (const [field, label] of [['drive_date', 'Drive'], ['application_deadline', 'Deadline']]) {
      const day = drive[field]
      if (!day) continue
      ;(events[day] ||= []).push({ drive, label })
    }
  }
  return events
}
