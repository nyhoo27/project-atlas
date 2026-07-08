import type { Metadata } from "next"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Dashboard — Atlas",
}

/**
 * Placeholder — the real dashboard (stat cards, my tasks, recent
 * activity) is Step 5.
 */
export default async function DashboardPage() {
  const { profile } = await requireWorkspaceContext()

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile?.full_name ?? "there"}.`}
      />
      <p className="text-sm text-muted-foreground">
        Dashboard content coming in Step 5.
      </p>
    </div>
  )
}
