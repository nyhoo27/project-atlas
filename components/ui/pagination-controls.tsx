import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PAGE_SIZE } from "@/lib/utils/pagination"
import { Button } from "@/components/ui/button"

/**
 * Previous/Next paging with a plain-language count. Links carry the
 * page's existing filters through, so paging never quietly drops a
 * search term or filter.
 */
export function PaginationControls({
  page,
  total,
  basePath,
  searchParams,
  pageSize = PAGE_SIZE,
  label = "records",
}: {
  page: number
  total: number
  basePath: string
  /** The page's current query string, so filters survive paging. */
  searchParams: Record<string, string | string[] | undefined>
  pageSize?: number
  label?: string
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  function hrefForPage(target: number): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue
      if (typeof value === "string" && value !== "") params.set(key, value)
    }
    if (target > 1) params.set("page", String(target))
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  // Nothing to page through, and nothing useful to say.
  if (total <= pageSize && page === 1) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {first.toLocaleString()}–{last.toLocaleString()} of{" "}
        {total.toLocaleString()} {label}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={hrefForPage(page - 1)} />}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          Page {page.toLocaleString()} of {lastPage.toLocaleString()}
        </span>
        {page < lastPage ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={hrefForPage(page + 1)} />}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
