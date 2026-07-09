import "server-only"
import { createClient } from "@/lib/supabase/server"

export type InteractionListRow = {
  id: string
  summary: string
  direction: string | null
  interaction_at: string
  next_follow_up_at: string | null
  created_by: string | null
  archived_at: string | null
  type: { label: string } | null
  customer: { id: string; name: string } | null
  item: { id: string; name: string } | null
}

export type InteractionListFilters = {
  search?: string
  typeOptionId?: string
  customerId?: string
  itemId?: string
  createdBy?: string
  showArchived?: boolean
}

export async function getInteractions(
  workspaceId: string,
  filters: InteractionListFilters
): Promise<InteractionListRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("interactions")
    .select(
      `id, summary, direction, interaction_at, next_follow_up_at, created_by, archived_at,
       type:settings_options(label),
       customer:customers(id, name),
       item:items(id, name)`
    )
    .eq("workspace_id", workspaceId)
    .order("interaction_at", { ascending: false })
    .limit(200)

  if (!filters.showArchived) {
    query = query.is("archived_at", null)
  }
  if (filters.typeOptionId) {
    query = query.eq("interaction_type_option_id", filters.typeOptionId)
  }
  if (filters.customerId) {
    query = query.eq("customer_id", filters.customerId)
  }
  if (filters.itemId) {
    query = query.eq("item_id", filters.itemId)
  }
  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy)
  }
  if (filters.search) {
    const term = filters.search.replace(/[,()]/g, " ").trim()
    if (term) {
      query = query.or(`summary.ilike.%${term}%,notes.ilike.%${term}%`)
    }
  }

  const { data } = await query
  return (data ?? []) as InteractionListRow[]
}

/** Active customers/items for the interaction form dropdowns. */
export async function getCustomerOptions(
  workspaceId: string
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customers")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500)
  return data ?? []
}

export async function getItemOptions(
  workspaceId: string
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("items")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500)
  return data ?? []
}
