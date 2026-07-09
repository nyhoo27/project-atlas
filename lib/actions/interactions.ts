"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { interactionSchema } from "@/lib/validators/interaction"
import { logActivity } from "@/lib/utils/activity"
import { canArchive, PERMISSION_ERROR } from "@/lib/permissions"

export type InteractionActionResult =
  | { ok: true; id: string; taskCreated: boolean; customerId: string | null }
  | { ok: false; error: string }

function orNull(value: string | undefined): string | null {
  return value ? value : null
}

/**
 * Logs an interaction — the heart of the app. Every role may do this.
 *
 * Runs entirely inside the create_interaction_with_follow_up Postgres
 * function (one transaction): interaction + activity log + optional
 * follow-up task + its activity log all succeed or fail together. The
 * function is SECURITY INVOKER, so RLS workspace isolation still
 * applies to every insert.
 */
export async function createInteraction(
  input: unknown
): Promise<InteractionActionResult> {
  const context = await requireWorkspaceContext()

  const parsed = interactionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }
  const values = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    "create_interaction_with_follow_up",
    {
      p_workspace_id: context.workspace.id,
      p_interaction_at: new Date(values.interactionAt).toISOString(),
      p_summary: values.summary,
      p_actor_name: context.profile?.full_name ?? "Someone",
      p_customer_id: orNull(values.customerId) ?? undefined,
      p_item_id: orNull(values.itemId) ?? undefined,
      p_type_option_id: orNull(values.typeOptionId) ?? undefined,
      p_direction: orNull(values.direction) ?? undefined,
      p_notes: orNull(values.notes) ?? undefined,
      p_next_follow_up_at: values.nextFollowUpAt
        ? new Date(values.nextFollowUpAt).toISOString()
        : undefined,
      p_follow_up_assigned_to: values.nextFollowUpAt
        ? (orNull(values.followUpAssignedTo) ?? undefined)
        : undefined,
    }
  )

  if (error || !data) {
    console.error("createInteraction failed:", error)
    return {
      ok: false,
      error: "Interaction could not be saved. Please try again.",
    }
  }

  const result = data as { interaction_id: string; task_id: string | null }

  revalidatePath("/app/interactions")
  revalidatePath("/app/tasks")
  revalidatePath("/app/dashboard")
  if (values.customerId) {
    revalidatePath(`/app/customers/${values.customerId}`)
  }
  if (values.itemId) {
    revalidatePath(`/app/items/${values.itemId}`)
  }

  return {
    ok: true,
    id: result.interaction_id,
    taskCreated: result.task_id !== null,
    customerId: orNull(values.customerId),
  }
}

/**
 * Interactions are append-only: archiving (Owner/Manager) is the only
 * change allowed, and the database trigger enforces that no other
 * column can be touched.
 */
export async function archiveInteraction(
  interactionId: string
): Promise<InteractionActionResult> {
  const context = await requireWorkspaceContext()
  if (!canArchive(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const supabase = await createClient()
  const { data: archived, error } = await supabase
    .from("interactions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", interactionId)
    .eq("workspace_id", context.workspace.id)
    .select("id, summary, customer_id")
    .maybeSingle()

  if (error || !archived) {
    console.error("archiveInteraction failed:", error)
    return {
      ok: false,
      error: "Interaction could not be archived. Please try again.",
    }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "interaction.archived",
    recordType: "interaction",
    recordId: interactionId,
    description: `${context.profile?.full_name ?? "Someone"} archived an interaction`,
  })

  revalidatePath("/app/interactions")
  return {
    ok: true,
    id: interactionId,
    taskCreated: false,
    customerId: archived.customer_id,
  }
}
