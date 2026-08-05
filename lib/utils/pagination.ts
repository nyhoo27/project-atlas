/**
 * Shared paging for list pages.
 *
 * Every list is capped by Supabase's API at 1,000 rows per request, so
 * pages must never try to fetch "everything" — past that point rows are
 * silently dropped. Paging keeps each request small and, just as
 * importantly, tells the user how many records actually exist.
 */

export const PAGE_SIZE = 50

/** Reads ?page= (1-based). Anything invalid falls back to the first page. */
export function getPage(value: string | string[] | undefined): number {
  const raw = typeof value === "string" ? parseInt(value, 10) : NaN
  return Number.isFinite(raw) && raw >= 1 ? raw : 1
}

/** Inclusive row range for a page, as Supabase's .range() expects. */
export function getRange(
  page: number,
  pageSize: number = PAGE_SIZE
): { from: number; to: number } {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export type Paginated<T> = {
  rows: T[]
  /** Total matching records, ignoring the page window. */
  total: number
}
