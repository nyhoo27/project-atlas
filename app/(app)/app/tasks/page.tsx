import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Tasks — Atlas",
}

// Placeholder — built in Step 9.
export default function TasksPage() {
  return (
    <div>
      <PageHeader title="Tasks" />
      <p className="text-sm text-muted-foreground">
        Tasks coming in Step 9.
      </p>
    </div>
  )
}
