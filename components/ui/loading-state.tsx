import { Skeleton } from "@/components/ui/skeleton"

/**
 * Generic page-loading skeleton: a heading bar plus a few content
 * rows. Used by the route-level loading.tsx files so navigation always
 * shows immediate feedback.
 */
export function LoadingState({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
