import type { Metadata } from "next"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { logout } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Dashboard — Atlas",
}

/**
 * Placeholder proving the auth + workspace flow works end to end.
 * The real dashboard (stat cards, my tasks, recent activity) is Step 5.
 */
export default async function DashboardPage() {
  const { profile, workspace, role } = await requireWorkspaceContext()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <p className="text-sm text-muted-foreground">
          Logged in as {profile?.full_name ?? "Unknown"} ({role})
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Dashboard coming in Step 5.
      </p>
      <form action={logout}>
        <Button variant="outline">Log out</Button>
      </form>
    </div>
  )
}
