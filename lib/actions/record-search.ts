"use server"

import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { canViewFinancials, canViewSuppliers } from "@/lib/permissions"

/**
 * Type-ahead lookups for record pickers. Workspace-scoped and capped at
 * a handful of rows, so a workspace with thousands of customers or
 * items never ships them all to the browser (which a plain <select>
 * would).
 */

export type RecordOption = {
  id: string
  name: string
  /** Secondary line: phone for customers, reference code for items. */
  hint?: string | null
  /** Items only — used to prefill the sale price. */
  sellingPrice?: number | null
  /** Items only, owner-only — used for the profit preview. */
  costPrice?: number | null
  /** Items only — units currently in stock. */
  quantity?: number | null
}

const LIMIT = 20

/** Strips characters PostgREST treats as syntax inside .or() filters. */
function sanitize(term: string): string {
  return term.replace(/[,()]/g, " ").trim()
}

export async function searchCustomers(rawTerm: string): Promise<RecordOption[]> {
  const context = await requireWorkspaceContext()
  const supabase = await createClient()
  const term = sanitize(rawTerm)

  let query = supabase
    .from("customers")
    .select("id, name, phone")
    .eq("workspace_id", context.workspace.id)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(LIMIT)

  if (term) {
    query = query.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,facebook.ilike.%${term}%,whatsapp.ilike.%${term}%`
    )
  }

  const { data } = await query
  return (data ?? []).map((customer) => ({
    id: customer.id,
    name: customer.name,
    hint: customer.phone,
  }))
}

export async function searchSuppliers(rawTerm: string): Promise<RecordOption[]> {
  const context = await requireWorkspaceContext()
  // Purchasing information is owner/manager only — return nothing rather
  // than leaking supplier names to other roles.
  if (!canViewSuppliers(context.role)) return []

  const supabase = await createClient()
  const term = sanitize(rawTerm)

  let query = supabase
    .from("suppliers")
    .select("id, name, contact_person, phone")
    .eq("workspace_id", context.workspace.id)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(LIMIT)

  if (term) {
    query = query.or(
      `name.ilike.%${term}%,contact_person.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
    )
  }

  const { data } = await query
  return (data ?? []).map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    hint: supplier.contact_person ?? supplier.phone,
  }))
}

export async function searchItems(rawTerm: string): Promise<RecordOption[]> {
  const context = await requireWorkspaceContext()
  const supabase = await createClient()
  const term = sanitize(rawTerm)
  const showCost = canViewFinancials(context.role)

  let query = supabase
    .from("items")
    .select("id, name, reference_code, selling_price, cost_price, quantity")
    .eq("workspace_id", context.workspace.id)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(LIMIT)

  if (term) {
    query = query.or(
      `name.ilike.%${term}%,reference_code.ilike.%${term}%,description.ilike.%${term}%`
    )
  }

  const { data } = await query
  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    // Stock matters when choosing what to sell, so show it alongside
    // the reference code.
    hint: [item.reference_code, `${item.quantity} in stock`]
      .filter(Boolean)
      .join(" · "),
    quantity: item.quantity,
    sellingPrice: item.selling_price != null ? Number(item.selling_price) : null,
    // Cost is owner-only, so non-owners never receive it.
    costPrice:
      showCost && item.cost_price != null ? Number(item.cost_price) : null,
  }))
}
