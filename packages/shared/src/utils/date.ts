/**
 * Format a date to ISO string
 */
export function toISOString(date: Date | string | number): string {
  return new Date(date).toISOString()
}

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date | string | number, locale = 'en-US'): string {
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date with time (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export function formatDateTime(date: Date | string | number, locale = 'en-US'): string {
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string | number, locale = 'en-US'): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second')
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute')
  } else if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour')
  } else {
    return rtf.format(diffDay, 'day')
  }
}

/**
 * Parse a date string in various formats
 */
export function parseDate(value: string | number | Date): Date {
  if (value instanceof Date) return value
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`)
  }
  return date
}

/**
 * Get the start of day for a given date
 */
export function startOfDay(date: Date | string | number): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the end of day for a given date
 */
export function endOfDay(date: Date | string | number): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Add duration to a date
 */
export function addDuration(
  date: Date | string | number,
  value: number,
  unit: 'minutes' | 'hours' | 'days'
): Date {
  const d = new Date(date)
  switch (unit) {
    case 'minutes':
      d.setMinutes(d.getMinutes() + value)
      break
    case 'hours':
      d.setHours(d.getHours() + value)
      break
    case 'days':
      d.setDate(d.getDate() + value)
      break
  }
  return d
}

/**
 * Get current timestamp in seconds (Unix timestamp)
 */
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Convert Unix timestamp to Date
 */
export function fromUnix(timestamp: number): Date {
  return new Date(timestamp * 1000)
}

/**
 * Get period string (YYYY-MM) for a date
 */
export function getPeriod(date: Date | string | number = new Date()): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
