"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireWorkspaceContext } from "@/lib/queries/current"
import {
  addMemberSchema,
  updateRoleSchema,
  ROLE_LABELS,
  type MemberRole,
} from "@/lib/validators/members"
import { logActivity } from "@/lib/utils/activity"
import { canManageMembers, PERMISSION_ERROR } from "@/lib/permissions"

export type MemberActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

/** Owner gate shared by every member action. */
async function requireOwnerContext() {
  const context = await requireWorkspaceContext()
  if (!canManageMembers(context.role)) return null
  return context
}

/**
 * Counts active owners in a workspace. Used to block the last owner from
 * being demoted, suspended, or removed — which would lock the workspace
 * out of its own administration.
 */
async function activeOwnerCount(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string
): Promise<number> {
  const { count } = await admin
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .eq("status", "active")
  return count ?? 0
}

/**
 * Adds a teammate. Owner-only. Creates their login account with the
 * initial password the owner chose (via the Admin API — a new user has
 * no RLS access yet), then the workspace membership. If the email
 * already has an Atlas account (e.g. they belong to another workspace),
 * that account is added to this workspace instead of creating a new one.
 */
export async function addMember(input: unknown): Promise<MemberActionResult> {
  const context = await requireOwnerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const parsed = addMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }
  const { fullName, email, role, password } = parsed.data

  const admin = createAdminClient()
  let userId: string
  let createdNewAccount = false

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

  if (created?.user) {
    userId = created.user.id
    createdNewAccount = true
  } else if (createError && /already|exists|registered/i.test(createError.message)) {
    // Existing Atlas account — add it to this workspace without touching
    // their password or name.
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    if (!existing) {
      return {
        ok: false,
        error: "This email already has an account, but it could not be found. Please contact support.",
      }
    }
    userId = existing.id
  } else {
    console.error("addMember: createUser failed:", createError)
    return { ok: false, error: "Member could not be added. Please try again." }
  }

  const { error: membershipError } = await admin
    .from("workspace_members")
    .insert({
      workspace_id: context.workspace.id,
      user_id: userId,
      role,
      status: "active",
      invited_by: context.userId,
    })

  if (membershipError) {
    if (membershipError.code === "23505") {
      return { ok: false, error: "This person is already a member of this workspace." }
    }
    // Roll back a just-created account so a retry is clean.
    if (createdNewAccount) {
      await admin.auth.admin.deleteUser(userId)
    }
    console.error("addMember: membership insert failed:", membershipError)
    return { ok: false, error: "Member could not be added. Please try again." }
  }

  const supabase = await createClient()
  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "member.added",
    recordType: "workspace_member",
    recordId: userId,
    description: `${context.profile?.full_name ?? "Someone"} added ${fullName} as ${ROLE_LABELS[role]}`,
  })

  revalidatePath("/app/settings")
  return {
    ok: true,
    message: createdNewAccount
      ? `${fullName} can now log in with the email and password you set.`
      : `${fullName} was added to this workspace.`,
  }
}

export async function updateMemberRole(
  targetUserId: string,
  input: unknown
): Promise<MemberActionResult> {
  const context = await requireOwnerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const parsed = updateRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid role." }
  }
  const newRole: MemberRole = parsed.data.role

  const admin = createAdminClient()

  const { data: target } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", targetUserId)
    .maybeSingle()
  if (!target) return { ok: false, error: "Member not found." }
  if (target.role === newRole) return { ok: true }

  // Don't strip the workspace of its last owner.
  if (
    target.role === "owner" &&
    newRole !== "owner" &&
    (await activeOwnerCount(admin, context.workspace.id)) <= 1
  ) {
    return {
      ok: false,
      error: "A workspace must have at least one owner. Make someone else an owner first.",
    }
  }

  const { error } = await admin
    .from("workspace_members")
    .update({ role: newRole })
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", targetUserId)

  if (error) {
    console.error("updateMemberRole failed:", error)
    return { ok: false, error: "Role could not be changed. Please try again." }
  }

  const supabase = await createClient()
  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "member.role_changed",
    recordType: "workspace_member",
    recordId: targetUserId,
    description: `${context.profile?.full_name ?? "Someone"} changed a member's role to ${ROLE_LABELS[newRole]}`,
  })

  revalidatePath("/app/settings")
  return { ok: true }
}

/** Suspend (revoke access) or reactivate a member. Owner-only. */
export async function setMemberStatus(
  targetUserId: string,
  active: boolean
): Promise<MemberActionResult> {
  const context = await requireOwnerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  if (targetUserId === context.userId) {
    return { ok: false, error: "You cannot suspend your own account." }
  }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", targetUserId)
    .maybeSingle()
  if (!target) return { ok: false, error: "Member not found." }

  if (
    !active &&
    target.role === "owner" &&
    (await activeOwnerCount(admin, context.workspace.id)) <= 1
  ) {
    return {
      ok: false,
      error: "A workspace must have at least one active owner.",
    }
  }

  const { error } = await admin
    .from("workspace_members")
    .update({ status: active ? "active" : "suspended" })
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", targetUserId)

  if (error) {
    console.error("setMemberStatus failed:", error)
    return { ok: false, error: "Member could not be updated. Please try again." }
  }

  const supabase = await createClient()
  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: active ? "member.reactivated" : "member.suspended",
    recordType: "workspace_member",
    recordId: targetUserId,
    description: `${context.profile?.full_name ?? "Someone"} ${active ? "reactivated" : "suspended"} a member`,
  })

  revalidatePath("/app/settings")
  return { ok: true }
}

/**
 * Removes a member from this workspace (deletes the membership row).
 * Owner-only. Their login account is NOT deleted — they may belong to
 * other workspaces — they simply lose access to this one.
 */
export async function removeMember(
  targetUserId: string
): Promise<MemberActionResult> {
  const context = await requireOwnerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  if (targetUserId === context.userId) {
    return { ok: false, error: "You cannot remove your own account." }
  }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", targetUserId)
    .maybeSingle()
  if (!target) return { ok: false, error: "Member not found." }

  if (
    target.role === "owner" &&
    target.status === "active" &&
    (await activeOwnerCount(admin, context.workspace.id)) <= 1
  ) {
    return {
      ok: false,
      error: "A workspace must have at least one owner.",
    }
  }

  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", targetUserId)

  if (error) {
    console.error("removeMember failed:", error)
    return { ok: false, error: "Member could not be removed. Please try again." }
  }

  const supabase = await createClient()
  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "member.removed",
    recordType: "workspace_member",
    recordId: targetUserId,
    description: `${context.profile?.full_name ?? "Someone"} removed a member from the workspace`,
  })

  revalidatePath("/app/settings")
  return { ok: true }
}
