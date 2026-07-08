import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Interactions — Atlas",
}

// Placeholder — built in Step 8.
export default function InteractionsPage() {
  return (
    <div>
      <PageHeader title="Interactions" />
      <p className="text-sm text-muted-foreground">
        Interactions coming in Step 8.
      </p>
    </div>
  )
}
