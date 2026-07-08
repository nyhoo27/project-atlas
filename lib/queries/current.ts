import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export type WorkspaceRole = "owner" | "manager" | "salesperson" | "staff"

export type CurrentContext = {
  userId: string
  profile: Profile | null
  role: WorkspaceRole
  workspace: Workspace
}

/**
 * Loads the logged-in user's profile plus their active workspace and role.
 * Wrapped in React cache() so the layout and page in the same request
 * share one lookup instead of hitting the database twice.
 *
 * Returns null when there is no logged-in user, and `workspace: null`-like
 * shape is avoided: a user without any active membership gets
 * { workspace: null } via CurrentContextResult so callers can show a
 * friendly "no workspace" screen instead of crashing.
 */
export const getCurrentContext = cache(
  async (): Promise<
    | { userId: string; profile: Profile | null; context: CurrentContext | null }
    | null
  > => {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("workspace_members")
        .select("role, workspace:workspaces(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    if (!membership || !membership.workspace) {
      return { userId: user.id, profile: profile ?? null, context: null }
    }

    return {
      userId: user.id,
      profile: profile ?? null,
      context: {
        userId: user.id,
        profile: profile ?? null,
        role: membership.role as WorkspaceRole,
        workspace: membership.workspace,
      },
    }
  }
)

/**
 * The guard used by every authenticated page and server action that needs
 * a workspace. Redirects to /login when signed out. Throws when the user
 * has no workspace — the (app) layout catches that case first and renders
 * a friendly screen, so pages/actions can rely on a non-null context.
 */
export async function requireWorkspaceContext(): Promise<CurrentContext> {
  const result = await getCurrentContext()
  if (!result) redirect("/login")
  if (!result.context) {
    throw new Error("You do not have access to a workspace.")
  }
  return result.context
}
