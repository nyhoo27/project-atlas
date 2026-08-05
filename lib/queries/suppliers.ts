import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getRange, type Paginated } from "@/lib/utils/pagination"

export type SupplierListRow = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  created_at: string
  archived_at: string | null
}

export async function getSuppliers(
  workspaceId: string,
  filters: { search?: string; showArchived?: boolean; page?: number }
): Promise<Paginated<SupplierListRow>> {
  const supabase = await createClient()
  const { from, to } = getRange(filters.page ?? 1)

  let query = supabase
    .from("suppliers")
    .select(
      "id, name, contact_person, phone, email, created_at, archived_at",
      { count: "exact" }
    )
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })
    .range(from, to)

  if (!filters.showArchived) query = query.is("archived_at", null)
  if (filters.search) {
    const term = filters.search.replace(/[,()]/g, " ").trim()
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,contact_person.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,notes.ilike.%${term}%`
      )
    }
  }

  const { data, count } = await query
  return { rows: data ?? [], total: count ?? 0 }
}

export type SupplierDetail = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export async function getSupplierById(
  workspaceId: string,
  supplierId: string
): Promise<SupplierDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("suppliers")
    .select(
      `id, name, contact_person, phone, email, address, notes,
       created_at, updated_at, archived_at`
    )
    .eq("workspace_id", workspaceId)
    .eq("id", supplierId)
    .maybeSingle()
  return data
}

/** Active suppliers for the item form's dropdown. */
export async function getSupplierOptions(
  workspaceId: string
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500)
  return data ?? []
}

/** Items bought from a supplier, for the supplier detail page. */
export async function getItemsBySupplier(
  workspaceId: string,
  supplierId: string
): Promise<
  {
    id: string
    name: string
    reference_code: string | null
    quantity: number
    status: { label: string } | null
  }[]
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("items")
    .select(
      `id, name, reference_code, quantity,
       status:settings_options!items_status_option_id_fkey(label)`
    )
    .eq("workspace_id", workspaceId)
    .eq("supplier_id", supplierId)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(200)
  return (data ?? []) as {
    id: string
    name: string
    reference_code: string | null
    quantity: number
    status: { label: string } | null
  }[]
}
