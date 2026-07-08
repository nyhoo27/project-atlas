"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Package,
  MessagesSquare,
  CheckSquare,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkspaceRole } from "@/lib/queries/current"

const NAV_ITEMS = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/items", label: "Items", icon: Package },
  { href: "/app/interactions", label: "Interactions", icon: MessagesSquare },
  { href: "/app/tasks", label: "Tasks", icon: CheckSquare },
  // Settings is Owner/Manager only — filtered below. Hiding the link is
  // cosmetic; the real check lives in the settings server actions.
  { href: "/app/settings", label: "Settings", icon: Settings, requiresManager: true },
] as const

export function SidebarNav({
  role,
  onNavigate,
}: {
  role: WorkspaceRole
  /** Called after a link is clicked — lets the mobile drawer close itself. */
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const canManage = role === "owner" || role === "manager"

  return (
    <nav className="flex flex-col gap-1 px-2">
      {NAV_ITEMS.filter((item) => !("requiresManager" in item) || canManage).map(
        (item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        }
      )}
    </nav>
  )
}
