/**
 * Returns { startDate, endDate } for a given ISO week number and year.
 *   startDate = Monday 00:00:00.000 UTC of that ISO week
 *   endDate   = Sunday 23:59:59.999 UTC of that ISO week
 *
 * ISO week rule: week 1 is the week containing the first Thursday of the year.
 * Equivalently, Jan 4 is always in ISO week 1.
 */
export function getWeekDateRange(weekNumber, year) {
  // Jan 4 of the given year is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7  // 1=Mon … 7=Sun

  // Monday of ISO week 1 for this year
  const week1Monday = new Date(Date.UTC(year, 0, 4 - (dayOfWeek - 1)))

  // Monday of the requested week
  const startDate = new Date(week1Monday)
  startDate.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7)

  // Sunday 23:59:59.999 UTC — six days after Monday
  const endDate = new Date(startDate)
  endDate.setUTCDate(startDate.getUTCDate() + 6)
  endDate.setUTCHours(23, 59, 59, 999)

  return { startDate, endDate }
}

/**
 * Returns the current ISO week number for today's date.
 */
export function getCurrentISOWeek() {
  const now = new Date()
  const jan4 = new Date(Date.UTC(now.getUTCFullYear(), 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const week1Monday = new Date(Date.UTC(now.getUTCFullYear(), 0, 4 - (dayOfWeek - 1)))
  const diff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - week1Monday.getTime()
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
}
