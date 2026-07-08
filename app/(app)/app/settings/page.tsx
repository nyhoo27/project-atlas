import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Settings — Atlas",
}

// Placeholder — built in Step 10.
export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <p className="text-sm text-muted-foreground">
        Settings coming in Step 10.
      </p>
    </div>
  )
}
