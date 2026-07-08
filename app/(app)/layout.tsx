import { redirect } from "next/navigation"
import { getCurrentContext } from "@/lib/queries/current"
import { logout } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"

/**
 * Guard + frame for every authenticated /app route. The proxy already
 * redirects signed-out visitors, but this is the authoritative
 * server-side check — and the place that handles the "signed in but no
 * workspace" edge case with a friendly screen instead of a crash.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await getCurrentContext()

  if (!result) {
    redirect("/login")
  }

  if (!result.context) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">No workspace found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account is not a member of any workspace. If your business
          already uses Atlas, ask the workspace owner to add you. Otherwise,
          sign up again to create a new workspace.
        </p>
        <form action={logout}>
          <Button variant="outline">Log out</Button>
        </form>
      </div>
    )
  }

  const { workspace, profile, role } = result.context

  return (
    <AppShell
      workspaceName={workspace.name}
      userName={profile?.full_name ?? "Unknown"}
      userEmail={profile?.email ?? ""}
      role={role}
    >
      {children}
    </AppShell>
  )
}
