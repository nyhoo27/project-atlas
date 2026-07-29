"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { supplierSchema, type SupplierValues } from "@/lib/validators/supplier"
import { logActivity } from "@/lib/utils/activity"
import { canManageSuppliers, canArchive, PERMISSION_ERROR } from "@/lib/permissions"

export type SupplierActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

function orNull(value: string | undefined): string | null {
  return value ? value : null
}

function toSupplierRow(values: SupplierValues) {
  return {
    name: values.name,
    contact_person: orNull(values.contactPerson),
    phone: orNull(values.phone),
    email: orNull(values.email),
    address: orNull(values.address),
    notes: orNull(values.notes),
  }
}

export async function createSupplier(
  input: unknown
): Promise<SupplierActionResult> {
  const context = await requireWorkspaceContext()
  if (!canManageSuppliers(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const parsed = supplierSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }

  const supabase = await createClient()
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({
      workspace_id: context.workspace.id,
      created_by: context.userId,
      ...toSupplierRow(parsed.data),
    })
    .select("id")
    .single()

  if (error || !supplier) {
    console.error("createSupplier failed:", error)
    return { ok: false, error: "Supplier could not be created. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "supplier.created",
    recordType: "supplier",
    recordId: supplier.id,
    description: `${context.profile?.full_name ?? "Someone"} added supplier ${parsed.data.name}`,
  })

  revalidatePath("/app/suppliers")
  return { ok: true, id: supplier.id }
}

export async function updateSupplier(
  supplierId: string,
  input: unknown
): Promise<SupplierActionResult> {
  const context = await requireWorkspaceContext()
  if (!canManageSuppliers(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const parsed = supplierSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from("suppliers")
    .update({ ...toSupplierRow(parsed.data), updated_by: context.userId })
    .eq("id", supplierId)
    .eq("workspace_id", context.workspace.id)
    .select("id")
    .maybeSingle()

  if (error || !updated) {
    console.error("updateSupplier failed:", error)
    return { ok: false, error: "Supplier could not be updated. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "supplier.updated",
    recordType: "supplier",
    recordId: supplierId,
    description: `${context.profile?.full_name ?? "Someone"} updated supplier ${parsed.data.name}`,
  })

  revalidatePath("/app/suppliers")
  revalidatePath(`/app/suppliers/${supplierId}`)
  return { ok: true, id: supplierId }
}

export async function archiveSupplier(
  supplierId: string
): Promise<SupplierActionResult> {
  const context = await requireWorkspaceContext()
  if (!canArchive(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const supabase = await createClient()
  const { data: archived, error } = await supabase
    .from("suppliers")
    .update({ archived_at: new Date().toISOString(), updated_by: context.userId })
    .eq("id", supplierId)
    .eq("workspace_id", context.workspace.id)
    .select("id, name")
    .maybeSingle()

  if (error || !archived) {
    console.error("archiveSupplier failed:", error)
    return { ok: false, error: "Supplier could not be archived. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "supplier.archived",
    recordType: "supplier",
    recordId: supplierId,
    description: `${context.profile?.full_name ?? "Someone"} archived supplier ${archived.name}`,
  })

  revalidatePath("/app/suppliers")
  revalidatePath(`/app/suppliers/${supplierId}`)
  return { ok: true, id: supplierId }
}
