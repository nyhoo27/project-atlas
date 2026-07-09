"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { taskSchema, type TaskValues } from "@/lib/validators/task"
import { logActivity } from "@/lib/utils/activity"
import { canArchive, canModifyTask, PERMISSION_ERROR } from "@/lib/permissions"

export type TaskActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

function orNull(value: string | undefined): string | null {
  return value ? value : null
}

function toTaskRow(values: TaskValues) {
  return {
    title: values.title,
    description: orNull(values.description),
    assigned_to: orNull(values.assignedTo),
    due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
    status_option_id: orNull(values.statusOptionId),
    priority_option_id: orNull(values.priorityOptionId),
    customer_id: orNull(values.customerId),
    item_id: orNull(values.itemId),
  }
}

/**
 * Looks up the value ("done", "cancelled", ...) behind a status option
 * id, so updates can keep completed_at in sync with the status.
 */
async function statusValueOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  statusOptionId: string | null
): Promise<string | null> {
  if (!statusOptionId) return null
  const { data } = await supabase
    .from("settings_options")
    .select("value")
    .eq("id", statusOptionId)
    .maybeSingle()
  return data?.value ?? null
}

export async function createTask(input: unknown): Promise<TaskActionResult> {
  const context = await requireWorkspaceContext()

  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }

  const supabase = await createClient()
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: context.workspace.id,
      created_by: context.userId,
      ...toTaskRow(parsed.data),
    })
    .select("id")
    .single()

  if (error || !task) {
    console.error("createTask failed:", error)
    return { ok: false, error: "Task could not be created. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "task.created",
    recordType: "task",
    recordId: task.id,
    description: `${context.profile?.full_name ?? "Someone"} created task ${parsed.data.title}`,
  })

  revalidatePath("/app/tasks")
  revalidatePath("/app/dashboard")
  return { ok: true, id: task.id }
}

export async function updateTask(
  taskId: string,
  input: unknown
): Promise<TaskActionResult> {
  const context = await requireWorkspaceContext()

  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, created_by, assigned_to, completed_at")
    .eq("id", taskId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle()
  if (!existing) {
    return { ok: false, error: "This task may have been archived or removed." }
  }
  if (!canModifyTask(context.role, context.userId, existing)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  // Keep completed_at in sync when the status is edited directly:
  // switching to Done stamps it, switching away clears it.
  const row = toTaskRow(parsed.data)
  const statusValue = await statusValueOf(supabase, row.status_option_id)
  const completedAt =
    statusValue === "done"
      ? (existing.completed_at ?? new Date().toISOString())
      : null

  const { error } = await supabase
    .from("tasks")
    .update({ ...row, completed_at: completedAt })
    .eq("id", taskId)
    .eq("workspace_id", context.workspace.id)

  if (error) {
    console.error("updateTask failed:", error)
    return { ok: false, error: "Task could not be updated. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "task.updated",
    recordType: "task",
    recordId: taskId,
    description: `${context.profile?.full_name ?? "Someone"} updated task ${parsed.data.title}`,
  })

  revalidatePath("/app/tasks")
  revalidatePath("/app/dashboard")
  return { ok: true, id: taskId }
}

/** Marks a task Done: completed_at = now, status = the Done option. */
export async function completeTask(taskId: string): Promise<TaskActionResult> {
  const context = await requireWorkspaceContext()
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, title, created_by, assigned_to, completed_at")
    .eq("id", taskId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle()
  if (!existing) {
    return { ok: false, error: "This task may have been archived or removed." }
  }
  if (!canModifyTask(context.role, context.userId, existing)) {
    return { ok: false, error: PERMISSION_ERROR }
  }
  if (existing.completed_at) {
    return { ok: false, error: "This task is already done." }
  }

  const { data: doneOption } = await supabase
    .from("settings_options")
    .select("id")
    .eq("workspace_id", context.workspace.id)
    .eq("option_type", "task_status")
    .eq("value", "done")
    .maybeSingle()

  const { error } = await supabase
    .from("tasks")
    .update({
      completed_at: new Date().toISOString(),
      ...(doneOption ? { status_option_id: doneOption.id } : {}),
    })
    .eq("id", taskId)
    .eq("workspace_id", context.workspace.id)

  if (error) {
    console.error("completeTask failed:", error)
    return { ok: false, error: "Task could not be completed. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "task.completed",
    recordType: "task",
    recordId: taskId,
    description: `${context.profile?.full_name ?? "Someone"} completed task ${existing.title}`,
  })

  revalidatePath("/app/tasks")
  revalidatePath("/app/dashboard")
  return { ok: true, id: taskId }
}

export async function archiveTask(taskId: string): Promise<TaskActionResult> {
  const context = await requireWorkspaceContext()
  if (!canArchive(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const supabase = await createClient()
  const { data: archived, error } = await supabase
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("workspace_id", context.workspace.id)
    .select("id, title")
    .maybeSingle()

  if (error || !archived) {
    console.error("archiveTask failed:", error)
    return { ok: false, error: "Task could not be archived. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "task.archived",
    recordType: "task",
    recordId: taskId,
    description: `${context.profile?.full_name ?? "Someone"} archived task ${archived.title}`,
  })

  revalidatePath("/app/tasks")
  revalidatePath("/app/dashboard")
  return { ok: true, id: taskId }
}
