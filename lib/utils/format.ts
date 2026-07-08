/**
 * Shared display formatting for dates and prices. Timestamps are stored
 * as UTC timestamptz in the database; these helpers render them in the
 * workspace timezone (default Asia/Yangon).
 */

const DEFAULT_TIMEZONE = "Asia/Yangon"

/** "MMK 120,000,000" — currency code prefix, no conversion. */
export function formatCurrency(
  value: number | null | undefined,
  currency: string
): string {
  if (value == null) return "—"
  return `${currency} ${new Intl.NumberFormat("en-US").format(value)}`
}

/** "Jul 8, 2026" */
export function formatDate(
  iso: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso))
}

/** "Jul 8, 2026, 3:30 PM" */
export function formatDateTime(
  iso: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

/** The calendar date ("2026-07-08") of an instant, in a timezone. */
function calendarDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/**
 * Readable relative time: "Just now", "5 minutes ago", "3 hours ago",
 * "Yesterday", "4 days ago", then falls back to the full date.
 */
export function formatRelative(
  iso: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!iso) return "—"
  const date = new Date(iso)
  const now = new Date()
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000)

  if (diffSeconds < 60) return "Just now"
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  const dayNow = calendarDate(now, timezone)
  const dayThen = calendarDate(date, timezone)
  const yesterday = calendarDate(new Date(now.getTime() - 86400_000), timezone)
  if (dayThen === dayNow) return "Today"
  if (dayThen === yesterday) return "Yesterday"

  const diffDays = Math.round(diffSeconds / 86400)
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(iso, timezone)
}

/**
 * UTC instants for the start and end of "today" in the given timezone.
 * Used for "due today" task queries.
 */
export function todayRange(timezone: string = DEFAULT_TIMEZONE): {
  start: Date
  end: Date
} {
  const now = new Date()
  const ymd = calendarDate(now, timezone) // e.g. "2026-07-08"
  // Find the UTC instant of midnight in the target timezone: take midnight
  // UTC of that calendar date, then shift by the zone's offset.
  const midnightUtc = new Date(`${ymd}T00:00:00Z`)
  const inZone = new Date(
    midnightUtc.toLocaleString("en-US", { timeZone: timezone })
  )
  const inUtc = new Date(midnightUtc.toLocaleString("en-US", { timeZone: "UTC" }))
  const offsetMs = inZone.getTime() - inUtc.getTime()
  const start = new Date(midnightUtc.getTime() - offsetMs)
  return { start, end: new Date(start.getTime() + 86400_000) }
}
