import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Items — Atlas",
}

// Placeholder — built in Step 7.
export default function ItemsPage() {
  return (
    <div>
      <PageHeader title="Items" />
      <p className="text-sm text-muted-foreground">
        Items coming in Step 7.
      </p>
    </div>
  )
}
