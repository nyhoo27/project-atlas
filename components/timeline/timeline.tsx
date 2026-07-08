import { Activity, MessagesSquare, CheckSquare } from "lucide-react"
import type { TimelineEntry } from "@/lib/queries/customers"
import { formatRelative, formatDateTime } from "@/lib/utils/format"
import { EmptyState } from "@/components/ui/empty-state"

const KIND_ICONS = {
  activity: Activity,
  interaction: MessagesSquare,
  task: CheckSquare,
} as const

/**
 * Vertical history of a record: activity logs, interactions, and tasks
 * merged into one newest-first list.
 */
export function Timeline({
  entries,
  timezone,
  emptyMessage = "No history yet.",
}: {
  entries: TimelineEntry[]
  timezone: string
  emptyMessage?: string
}) {
  if (entries.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <ol className="space-y-0">
      {entries.map((entry, index) => {
        const Icon = KIND_ICONS[entry.kind]
        const isLast = index === entries.length - 1
        return (
          <li key={entry.id} className="relative flex gap-3 pb-6">
            {/* Connector line */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-full w-px bg-border"
              />
            )}
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm">{entry.description}</p>
              <p
                className="text-xs text-muted-foreground"
                title={formatDateTime(entry.timestamp, timezone)}
              >
                {formatRelative(entry.timestamp, timezone)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
