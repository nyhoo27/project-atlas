import "server-only"
import { createClient } from "@/lib/supabase/server"

export type Member = {
  userId: string
  fullName: string
  email: string
  role: string
}

/**
 * Active members of a workspace with their profile names. Two queries
 * because workspace_members references auth.users (not profiles), so
 * PostgREST cannot join them directly.
 */
export async function getWorkspaceMembers(
  workspaceId: string
): Promise<Member[]> {
  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")

  if (!memberships || memberships.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      memberships.map((m) => m.user_id)
    )

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  return memberships.map((m) => {
    const profile = profileById.get(m.user_id)
    return {
      userId: m.user_id,
      fullName: profile?.full_name ?? "Unknown",
      email: profile?.email ?? "",
      role: m.role,
    }
  })
}

export type ManagedMember = Member & {
  status: string
  joinedAt: string
}

/**
 * Every member of a workspace — active AND suspended — for the Members
 * settings manager. (getWorkspaceMembers returns only active members,
 * for assignment dropdowns.)
 */
export async function getAllWorkspaceMembers(
  workspaceId: string
): Promise<ManagedMember[]> {
  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("user_id, role, status, joined_at")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true })

  if (!memberships || memberships.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      memberships.map((m) => m.user_id)
    )

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  return memberships.map((m) => {
    const profile = profileById.get(m.user_id)
    return {
      userId: m.user_id,
      fullName: profile?.full_name ?? "Unknown",
      email: profile?.email ?? "",
      role: m.role,
      status: m.status,
      joinedAt: m.joined_at,
    }
  })
}
