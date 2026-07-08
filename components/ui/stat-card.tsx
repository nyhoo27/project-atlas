import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Dashboard stat: a number, a label, and a link to the page behind it.
 */
export function StatCard({
  label,
  value,
  href,
  icon: Icon,
  emphasis = false,
}: {
  label: string
  value: number | string
  href: string
  icon: LucideIcon
  /** Highlights the value (used for overdue tasks). */
  emphasis?: boolean
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                emphasis && Number(value) > 0 && "text-destructive"
              )}
            >
              {value}
            </p>
            <p className="truncate text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
