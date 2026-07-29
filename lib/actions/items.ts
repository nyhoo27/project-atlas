"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { itemSchema, type ItemValues } from "@/lib/validators/item"
import { logActivity } from "@/lib/utils/activity"
import {
  canCreateItem,
  canEditItem,
  canArchive,
  PERMISSION_ERROR,
} from "@/lib/permissions"

export type ItemActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

function orNull(value: string | undefined): string | null {
  return value ? value : null
}

function moneyOrNull(value: string): number | null {
  return value === "" ? null : Number(value)
}

/** Form values -> database columns, shared by create and update. */
function toItemRow(values: ItemValues) {
  // With a breakdown, the total cost IS the sum of its rows — computed
  // here on the server so the stored cost_price can never drift.
  const breakdown = values.costBreakdown.map((component) => ({
    label: component.label,
    amount: Number(component.amount),
  }))
  const costPrice =
    breakdown.length > 0
      ? Math.round(breakdown.reduce((sum, c) => sum + c.amount, 0) * 100) / 100
      : moneyOrNull(values.costPrice)

  return {
    name: values.name,
    reference_code: orNull(values.referenceCode),
    category_option_id: orNull(values.categoryOptionId),
    status_option_id: orNull(values.statusOptionId),
    supplier_id: orNull(values.supplierId),
    description: orNull(values.description),
    cost_price: costPrice,
    cost_breakdown: breakdown,
    selling_price: moneyOrNull(values.sellingPrice),
    quantity: parseInt(values.quantity, 10),
    location: orNull(values.location),
    notes: orNull(values.notes),
  }
}

export async function createItem(input: unknown): Promise<ItemActionResult> {
  const context = await requireWorkspaceContext()
  if (!canCreateItem(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }

  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      workspace_id: context.workspace.id,
      created_by: context.userId,
      ...toItemRow(parsed.data),
    })
    .select("id")
    .single()

  if (error || !item) {
    console.error("createItem failed:", error)
    return { ok: false, error: "Item could not be created. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "item.created",
    recordType: "item",
    recordId: item.id,
    description: `${context.profile?.full_name ?? "Someone"} created item ${parsed.data.name}`,
  })

  revalidatePath("/app/items")
  revalidatePath("/app/dashboard")
  return { ok: true, id: item.id }
}

export async function updateItem(
  itemId: string,
  input: unknown
): Promise<ItemActionResult> {
  const context = await requireWorkspaceContext()
  if (!canEditItem(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from("items")
    .update({ ...toItemRow(parsed.data), updated_by: context.userId })
    .eq("id", itemId)
    .eq("workspace_id", context.workspace.id)
    .select("id")
    .maybeSingle()

  if (error || !updated) {
    console.error("updateItem failed:", error)
    return { ok: false, error: "Item could not be updated. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "item.updated",
    recordType: "item",
    recordId: itemId,
    description: `${context.profile?.full_name ?? "Someone"} updated item ${parsed.data.name}`,
  })

  revalidatePath("/app/items")
  revalidatePath(`/app/items/${itemId}`)
  return { ok: true, id: itemId }
}

export async function archiveItem(itemId: string): Promise<ItemActionResult> {
  const context = await requireWorkspaceContext()
  if (!canArchive(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const supabase = await createClient()
  const { data: archived, error } = await supabase
    .from("items")
    .update({ archived_at: new Date().toISOString(), updated_by: context.userId })
    .eq("id", itemId)
    .eq("workspace_id", context.workspace.id)
    .select("id, name")
    .maybeSingle()

  if (error || !archived) {
    console.error("archiveItem failed:", error)
    return { ok: false, error: "Item could not be archived. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "item.archived",
    recordType: "item",
    recordId: itemId,
    description: `${context.profile?.full_name ?? "Someone"} archived item ${archived.name}`,
  })

  revalidatePath("/app/items")
  revalidatePath(`/app/items/${itemId}`)
  revalidatePath("/app/dashboard")
  return { ok: true, id: itemId }
}
