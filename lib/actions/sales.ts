"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { saleSchema, type SaleValues } from "@/lib/validators/sale"
import { logActivity } from "@/lib/utils/activity"
import { canCreateSale, canModifySale, canArchive, PERMISSION_ERROR } from "@/lib/permissions"

export type SaleActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

function orNull(value: string | undefined): string | null {
  return value ? value : null
}

/**
 * The stock trigger raises a readable message when a sale would take
 * more units than an item has ("Not enough stock: only 3 left"). Pass
 * that through rather than burying it under a generic failure.
 */
function stockMessage(error: { message?: string } | null): string | null {
  const match = (error?.message ?? "").match(/Not enough stock:[^\n]*/)
  return match ? match[0].trim() : null
}

/**
 * A sale's cost is never typed on the sale form — it is captured from
 * the item it belongs to. Snapshotting it onto the sale keeps profit
 * fixed even if the item's cost is edited later.
 */
async function costOfItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  itemId: string | null
): Promise<number | null> {
  if (!itemId) return null
  const { data: item } = await supabase
    .from("items")
    .select("cost_price")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  return item?.cost_price != null ? Number(item.cost_price) : null
}

function baseRow(values: SaleValues) {
  return {
    customer_id: orNull(values.customerId),
    item_id: orNull(values.itemId),
    status_option_id: orNull(values.statusOptionId),
    sale_price: Number(values.salePrice),
    quantity: parseInt(values.quantity, 10),
    sold_at: new Date(values.soldAt).toISOString(),
    notes: orNull(values.notes),
  }
}

export async function createSale(input: unknown): Promise<SaleActionResult> {
  const context = await requireWorkspaceContext()
  if (!canCreateSale(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const parsed = saleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }
  const values = parsed.data
  const supabase = await createClient()

  const costPrice = await costOfItem(
    supabase,
    context.workspace.id,
    orNull(values.itemId)
  )

  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      workspace_id: context.workspace.id,
      created_by: context.userId,
      sold_by: orNull(values.soldBy) ?? context.userId,
      cost_price: costPrice,
      ...baseRow(values),
    })
    .select("id")
    .single()

  if (error || !sale) {
    const shortage = stockMessage(error)
    if (shortage) return { ok: false, error: shortage }
    console.error("createSale failed:", error)
    return { ok: false, error: "Sale could not be recorded. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "sale.created",
    recordType: "sale",
    recordId: sale.id,
    description: `${context.profile?.full_name ?? "Someone"} recorded a sale`,
  })

  revalidatePath("/app/sales")
  revalidatePath("/app/dashboard")
  if (values.customerId) revalidatePath(`/app/customers/${values.customerId}`)
  if (values.itemId) revalidatePath(`/app/items/${values.itemId}`)
  return { ok: true, id: sale.id }
}

export async function updateSale(
  saleId: string,
  input: unknown
): Promise<SaleActionResult> {
  const context = await requireWorkspaceContext()

  const parsed = saleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }
  const values = parsed.data
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("sales")
    .select("id, created_by, sold_by, item_id, cost_price")
    .eq("id", saleId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle()
  if (!existing) {
    return { ok: false, error: "This sale may have been archived or removed." }
  }
  if (!canModifySale(context.role, context.userId, existing)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  // Keep the original cost snapshot; only re-capture when the sale is
  // pointed at a different item.
  const newItemId = orNull(values.itemId)
  const costPrice =
    newItemId === existing.item_id
      ? existing.cost_price != null
        ? Number(existing.cost_price)
        : null
      : await costOfItem(supabase, context.workspace.id, newItemId)

  const { error } = await supabase
    .from("sales")
    .update({
      sold_by: orNull(values.soldBy) ?? existing.sold_by,
      cost_price: costPrice,
      updated_by: context.userId,
      ...baseRow(values),
    })
    .eq("id", saleId)
    .eq("workspace_id", context.workspace.id)

  if (error) {
    const shortage = stockMessage(error)
    if (shortage) return { ok: false, error: shortage }
    console.error("updateSale failed:", error)
    return { ok: false, error: "Sale could not be updated. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "sale.updated",
    recordType: "sale",
    recordId: saleId,
    description: `${context.profile?.full_name ?? "Someone"} updated a sale`,
  })

  revalidatePath("/app/sales")
  revalidatePath(`/app/sales/${saleId}`)
  revalidatePath("/app/dashboard")
  return { ok: true, id: saleId }
}

export async function archiveSale(saleId: string): Promise<SaleActionResult> {
  const context = await requireWorkspaceContext()
  if (!canArchive(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const supabase = await createClient()
  const { data: archived, error } = await supabase
    .from("sales")
    .update({ archived_at: new Date().toISOString(), updated_by: context.userId })
    .eq("id", saleId)
    .eq("workspace_id", context.workspace.id)
    .select("id")
    .maybeSingle()

  if (error || !archived) {
    console.error("archiveSale failed:", error)
    return { ok: false, error: "Sale could not be archived. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "sale.archived",
    recordType: "sale",
    recordId: saleId,
    description: `${context.profile?.full_name ?? "Someone"} archived a sale`,
  })

  revalidatePath("/app/sales")
  revalidatePath("/app/dashboard")
  return { ok: true, id: saleId }
}
