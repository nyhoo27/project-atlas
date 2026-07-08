import { SidebarNav } from "@/components/layout/sidebar-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { GlobalSearch } from "@/components/layout/global-search"
import { UserMenu } from "@/components/layout/user-menu"
import type { WorkspaceRole } from "@/lib/queries/current"

/**
 * The authenticated app frame: fixed sidebar on desktop, sheet drawer on
 * mobile, topbar with global search and the user menu. Rendered by the
 * (app) layout around every /app page.
 */
export function AppShell({
  workspaceName,
  userName,
  userEmail,
  role,
  children,
}: {
  workspaceName: string
  userName: string
  userEmail: string
  role: WorkspaceRole
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh w-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workspaceName}</p>
            <p className="text-xs text-muted-foreground">Atlas</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav role={role} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-4">
          <MobileNav workspaceName={workspaceName} role={role} />
          <span className="truncate text-sm font-semibold md:hidden">
            {workspaceName}
          </span>
          <div className="hidden flex-1 md:block">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <UserMenu name={userName} email={userEmail} role={role} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  )
}
