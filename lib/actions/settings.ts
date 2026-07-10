"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import {
  workspaceInfoSchema,
  optionLabelSchema,
  tagNameSchema,
  OPTION_TYPES,
} from "@/lib/validators/settings"
import { logActivity } from "@/lib/utils/activity"
import { slugify } from "@/lib/utils/slugify"
import { canManageSettings, PERMISSION_ERROR } from "@/lib/permissions"

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string }

/** Every settings action starts with the same owner/manager gate. */
async function requireManagerContext() {
  const context = await requireWorkspaceContext()
  if (!canManageSettings(context.role)) {
    return null
  }
  return context
}

// ---------------------------------------------------------------------------
// Workspace info
// ---------------------------------------------------------------------------

export async function updateWorkspaceInfo(
  input: unknown
): Promise<SettingsActionResult> {
  const context = await requireManagerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const parsed = workspaceInfoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("workspaces")
    .update({
      name: parsed.data.name,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
    })
    .eq("id", context.workspace.id)

  if (error) {
    console.error("updateWorkspaceInfo failed:", error)
    return { ok: false, error: "Workspace could not be updated. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "workspace.updated",
    recordType: "workspace",
    recordId: context.workspace.id,
    description: `${context.profile?.full_name ?? "Someone"} updated workspace settings`,
  })

  // Workspace name shows in the app shell on every page.
  revalidatePath("/app", "layout")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Settings options (dropdown values)
// ---------------------------------------------------------------------------

function isValidOptionType(value: string): boolean {
  return (OPTION_TYPES as readonly string[]).includes(value)
}

export async function createSettingsOption(
  optionType: string,
  input: unknown
): Promise<SettingsActionResult> {
  const context = await requireManagerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }
  if (!isValidOptionType(optionType)) {
    return { ok: false, error: "Unknown option type." }
  }

  const parsed = optionLabelSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please enter a label." }
  }
  const label = parsed.data.label
  // The value is the stable machine key (e.g. "in_progress"). It is set
  // once at creation and never changes on rename.
  const value = slugify(label).replace(/-/g, "_")
  if (!value) {
    return { ok: false, error: "Please use letters or numbers in the label." }
  }

  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from("settings_options")
    .select("sort_order")
    .eq("workspace_id", context.workspace.id)
    .eq("option_type", optionType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from("settings_options").insert({
    workspace_id: context.workspace.id,
    option_type: optionType,
    label,
    value,
    sort_order: (maxRow?.sort_order ?? 0) + 1,
  })

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "An option with this name already exists." }
    }
    console.error("createSettingsOption failed:", error)
    return { ok: false, error: "Option could not be created. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "settings.created",
    recordType: "settings_option",
    recordId: null,
    description: `${context.profile?.full_name ?? "Someone"} added option "${label}"`,
  })

  revalidatePath("/app/settings")
  return { ok: true }
}

export async function renameSettingsOption(
  optionId: string,
  input: unknown
): Promise<SettingsActionResult> {
  const context = await requireManagerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const parsed = optionLabelSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please enter a label." }
  }

  const supabase = await createClient()
  // Only the label changes on rename — the value stays stable because
  // system behavior (e.g. the "done" task status) depends on it.
  const { data: updated, error } = await supabase
    .from("settings_options")
    .update({ label: parsed.data.label })
    .eq("id", optionId)
    .eq("workspace_id", context.workspace.id)
    .select("label")
    .maybeSingle()

  if (error || !updated) {
    console.error("renameSettingsOption failed:", error)
    return { ok: false, error: "Option could not be renamed. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "settings.updated",
    recordType: "settings_option",
    recordId: optionId,
    description: `${context.profile?.full_name ?? "Someone"} renamed an option to "${parsed.data.label}"`,
  })

  revalidatePath("/app/settings")
  return { ok: true }
}

export async function setSettingsOptionActive(
  optionId: string,
  active: boolean
): Promise<SettingsActionResult> {
  const context = await requireManagerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const supabase = await createClient()

  if (!active) {
    // Defaults (and the Done task status the app relies on) must stay
    // active — the interaction/task flows look them up.
    const { data: option } = await supabase
      .from("settings_options")
      .select("is_default, option_type, value")
      .eq("id", optionId)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle()
    if (!option) {
      return { ok: false, error: "Option not found." }
    }
    if (
      option.is_default ||
      (option.option_type === "task_status" && option.value === "done")
    ) {
      return {
        ok: false,
        error:
          "This option is used by the system as a default and cannot be deactivated.",
      }
    }
  }

  const { data: updated, error } = await supabase
    .from("settings_options")
    .update({ is_active: active })
    .eq("id", optionId)
    .eq("workspace_id", context.workspace.id)
    .select("label")
    .maybeSingle()

  if (error || !updated) {
    console.error("setSettingsOptionActive failed:", error)
    return { ok: false, error: "Option could not be updated. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "settings.updated",
    recordType: "settings_option",
    recordId: optionId,
    description: `${context.profile?.full_name ?? "Someone"} ${active ? "reactivated" : "deactivated"} option "${updated.label}"`,
  })

  revalidatePath("/app/settings")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function createTag(input: unknown): Promise<SettingsActionResult> {
  const context = await requireManagerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const parsed = tagNameSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please enter a tag name." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("tags").insert({
    workspace_id: context.workspace.id,
    name: parsed.data.name,
  })

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A tag with this name already exists." }
    }
    console.error("createTag failed:", error)
    return { ok: false, error: "Tag could not be created. Please try again." }
  }

  revalidatePath("/app/settings")
  return { ok: true }
}

export async function renameTag(
  tagId: string,
  input: unknown
): Promise<SettingsActionResult> {
  const context = await requireManagerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const parsed = tagNameSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please enter a tag name." }
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from("tags")
    .update({ name: parsed.data.name })
    .eq("id", tagId)
    .eq("workspace_id", context.workspace.id)
    .select("id")
    .maybeSingle()

  if (error || !updated) {
    if (error?.code === "23505") {
      return { ok: false, error: "A tag with this name already exists." }
    }
    console.error("renameTag failed:", error)
    return { ok: false, error: "Tag could not be renamed. Please try again." }
  }

  revalidatePath("/app/settings")
  return { ok: true }
}

export async function deleteTag(tagId: string): Promise<SettingsActionResult> {
  const context = await requireManagerContext()
  if (!context) return { ok: false, error: PERMISSION_ERROR }

  const supabase = await createClient()
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", tagId)
    .eq("workspace_id", context.workspace.id)

  if (error) {
    console.error("deleteTag failed:", error)
    return { ok: false, error: "Tag could not be deleted. Please try again." }
  }

  revalidatePath("/app/settings")
  return { ok: true }
}
