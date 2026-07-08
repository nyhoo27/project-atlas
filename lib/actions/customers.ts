"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { customerSchema } from "@/lib/validators/customer"
import { logActivity } from "@/lib/utils/activity"
import {
  canCreateCustomer,
  canEditCustomer,
  canArchive,
  PERMISSION_ERROR,
} from "@/lib/permissions"

export type CustomerActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  /** Same phone already exists — the form asks the user to confirm. */
  | { ok: false; duplicate: true; error: string }

/** "" from empty form inputs becomes null in the database. */
function orNull(value: string | undefined): string | null {
  return value ? value : null
}

/**
 * Returns the name of another customer in this workspace using the same
 * phone number, or null. Used for the warn-but-don't-block duplicate
 * check (two customers may legitimately share a number).
 */
async function findDuplicatePhone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  phone: string,
  excludeCustomerId?: string
): Promise<string | null> {
  let query = supabase
    .from("customers")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("phone", phone)
    .limit(1)
  if (excludeCustomerId) {
    query = query.neq("id", excludeCustomerId)
  }
  const { data } = await query
  return data && data.length > 0 ? data[0].name : null
}

export async function createCustomer(
  input: unknown,
  options: { confirmDuplicate?: boolean } = {}
): Promise<CustomerActionResult> {
  const context = await requireWorkspaceContext()
  if (!canCreateCustomer(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }
  const values = parsed.data
  const supabase = await createClient()

  if (values.phone && !options.confirmDuplicate) {
    const existingName = await findDuplicatePhone(
      supabase,
      context.workspace.id,
      values.phone
    )
    if (existingName) {
      return {
        ok: false,
        duplicate: true,
        error: `Another customer with this phone number already exists (${existingName}).`,
      }
    }
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      workspace_id: context.workspace.id,
      name: values.name,
      phone: orNull(values.phone),
      email: orNull(values.email),
      facebook: orNull(values.facebook),
      whatsapp: orNull(values.whatsapp),
      address: orNull(values.address),
      notes: orNull(values.notes),
      source_option_id: orNull(values.sourceOptionId),
      assigned_to: orNull(values.assignedTo),
      created_by: context.userId,
    })
    .select("id")
    .single()

  if (error || !customer) {
    console.error("createCustomer failed:", error)
    return { ok: false, error: "Customer could not be created. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "customer.created",
    recordType: "customer",
    recordId: customer.id,
    description: `${context.profile?.full_name ?? "Someone"} created customer ${values.name}`,
  })

  revalidatePath("/app/customers")
  revalidatePath("/app/dashboard")
  return { ok: true, id: customer.id }
}

export async function updateCustomer(
  customerId: string,
  input: unknown,
  options: { confirmDuplicate?: boolean } = {}
): Promise<CustomerActionResult> {
  const context = await requireWorkspaceContext()
  if (!canEditCustomer(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." }
  }
  const values = parsed.data
  const supabase = await createClient()

  if (values.phone && !options.confirmDuplicate) {
    const existingName = await findDuplicatePhone(
      supabase,
      context.workspace.id,
      values.phone,
      customerId
    )
    if (existingName) {
      return {
        ok: false,
        duplicate: true,
        error: `Another customer with this phone number already exists (${existingName}).`,
      }
    }
  }

  const { data: updated, error } = await supabase
    .from("customers")
    .update({
      name: values.name,
      phone: orNull(values.phone),
      email: orNull(values.email),
      facebook: orNull(values.facebook),
      whatsapp: orNull(values.whatsapp),
      address: orNull(values.address),
      notes: orNull(values.notes),
      source_option_id: orNull(values.sourceOptionId),
      assigned_to: orNull(values.assignedTo),
      updated_by: context.userId,
    })
    .eq("id", customerId)
    .eq("workspace_id", context.workspace.id)
    .select("id")
    .maybeSingle()

  if (error || !updated) {
    console.error("updateCustomer failed:", error)
    return { ok: false, error: "Customer could not be updated. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "customer.updated",
    recordType: "customer",
    recordId: customerId,
    description: `${context.profile?.full_name ?? "Someone"} updated customer ${values.name}`,
  })

  revalidatePath("/app/customers")
  revalidatePath(`/app/customers/${customerId}`)
  return { ok: true, id: customerId }
}

export async function archiveCustomer(
  customerId: string
): Promise<CustomerActionResult> {
  const context = await requireWorkspaceContext()
  if (!canArchive(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const supabase = await createClient()
  const { data: archived, error } = await supabase
    .from("customers")
    .update({ archived_at: new Date().toISOString(), updated_by: context.userId })
    .eq("id", customerId)
    .eq("workspace_id", context.workspace.id)
    .select("id, name")
    .maybeSingle()

  if (error || !archived) {
    console.error("archiveCustomer failed:", error)
    return { ok: false, error: "Customer could not be archived. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "customer.archived",
    recordType: "customer",
    recordId: customerId,
    description: `${context.profile?.full_name ?? "Someone"} archived customer ${archived.name}`,
  })

  revalidatePath("/app/customers")
  revalidatePath(`/app/customers/${customerId}`)
  revalidatePath("/app/dashboard")
  return { ok: true, id: customerId }
}
