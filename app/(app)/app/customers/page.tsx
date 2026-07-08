import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Customers — Atlas",
}

// Placeholder — built in Step 6.
export default function CustomersPage() {
  return (
    <div>
      <PageHeader title="Customers" />
      <p className="text-sm text-muted-foreground">
        Customers coming in Step 6.
      </p>
    </div>
  )
}
