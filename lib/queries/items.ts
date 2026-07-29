import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { TimelineEntry } from "@/lib/queries/customers"

export type ItemListRow = {
  id: string
  name: string
  reference_code: string | null
  selling_price: number | null
  quantity: number
  created_at: string
  archived_at: string | null
  category: { label: string; color: string | null } | null
  status: { label: string; color: string | null } | null
}

export type ItemListFilters = {
  search?: string
  categoryOptionId?: string
  statusOptionId?: string
  showArchived?: boolean
}

export async function getItems(
  workspaceId: string,
  filters: ItemListFilters
): Promise<ItemListRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("items")
    .select(
      `id, name, reference_code, selling_price, quantity, created_at, archived_at,
       category:settings_options!items_category_option_id_fkey(label, color),
       status:settings_options!items_status_option_id_fkey(label, color)`
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (!filters.showArchived) {
    query = query.is("archived_at", null)
  }
  if (filters.categoryOptionId) {
    query = query.eq("category_option_id", filters.categoryOptionId)
  }
  if (filters.statusOptionId) {
    query = query.eq("status_option_id", filters.statusOptionId)
  }
  if (filters.search) {
    const term = filters.search.replace(/[,()]/g, " ").trim()
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,reference_code.ilike.%${term}%,description.ilike.%${term}%,notes.ilike.%${term}%`
      )
    }
  }

  const { data } = await query
  return (data ?? []) as ItemListRow[]
}

export type CostComponent = { label: string; amount: number }

export type ItemDetail = {
  id: string
  name: string
  reference_code: string | null
  description: string | null
  cost_price: number | null
  cost_breakdown: CostComponent[]
  selling_price: number | null
  quantity: number
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  category_option_id: string | null
  status_option_id: string | null
  supplier_id: string | null
  category: { label: string; color: string | null } | null
  status: { label: string; color: string | null } | null
  supplier: { id: string; name: string } | null
}

export async function getItemById(
  workspaceId: string,
  itemId: string
): Promise<ItemDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("items")
    .select(
      `id, name, reference_code, description, cost_price, cost_breakdown,
       selling_price, quantity, location, notes, created_at, updated_at,
       archived_at, category_option_id, status_option_id, supplier_id,
       category:settings_options!items_category_option_id_fkey(label, color),
       status:settings_options!items_status_option_id_fkey(label, color),
       supplier:suppliers(id, name)`
    )
    .eq("workspace_id", workspaceId)
    .eq("id", itemId)
    .maybeSingle()
  return data as ItemDetail | null
}

export type ItemInteraction = {
  id: string
  summary: string
  direction: string | null
  interaction_at: string
  next_follow_up_at: string | null
  type: { label: string } | null
  customer: { id: string; name: string } | null
}

export type ItemTask = {
  id: string
  title: string
  due_at: string | null
  completed_at: string | null
  created_at: string
  assigned_to: string | null
  status: { value: string; label: string } | null
  priority: { label: string } | null
}

/**
 * Detail-tab data: interactions, tasks, interested customers (everyone
 * who has an interaction mentioning this item), and the merged timeline.
 */
export async function getItemRelated(
  workspaceId: string,
  itemId: string
): Promise<{
  interactions: ItemInteraction[]
  tasks: ItemTask[]
  interestedCustomers: { id: string; name: string }[]
  timeline: TimelineEntry[]
}> {
  const supabase = await createClient()

  const [interactionsResult, tasksResult, activityResult] = await Promise.all([
    supabase
      .from("interactions")
      .select(
        `id, summary, direction, interaction_at, next_follow_up_at,
         type:settings_options(label),
         customer:customers(id, name)`
      )
      .eq("workspace_id", workspaceId)
      .eq("item_id", itemId)
      .is("archived_at", null)
      .order("interaction_at", { ascending: false })
      .limit(100),
    supabase
      .from("tasks")
      .select(
        `id, title, due_at, completed_at, created_at, assigned_to,
         status:settings_options!tasks_status_option_id_fkey(value, label),
         priority:settings_options!tasks_priority_option_id_fkey(label)`
      )
      .eq("workspace_id", workspaceId)
      .eq("item_id", itemId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("activity_logs")
      .select("id, description, created_at")
      .eq("workspace_id", workspaceId)
      .eq("record_type", "item")
      .eq("record_id", itemId)
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const interactions = (interactionsResult.data ?? []) as ItemInteraction[]
  const tasks = (tasksResult.data ?? []) as ItemTask[]

  const interestedCustomers = Array.from(
    new Map(
      interactions
        .filter((i) => i.customer !== null)
        .map((i) => [i.customer!.id, i.customer!])
    ).values()
  )

  const timeline: TimelineEntry[] = [
    ...(activityResult.data ?? []).map((log) => ({
      id: `activity-${log.id}`,
      kind: "activity" as const,
      description: log.description,
      timestamp: log.created_at,
    })),
    ...interactions.map((interaction) => ({
      id: `interaction-${interaction.id}`,
      kind: "interaction" as const,
      description: `${interaction.type?.label ?? "Interaction"}: ${interaction.summary}`,
      timestamp: interaction.interaction_at,
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      kind: "task" as const,
      description: task.completed_at
        ? `Task completed: ${task.title}`
        : `Task created: ${task.title}`,
      timestamp: task.completed_at ?? task.created_at,
    })),
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return { interactions, tasks, interestedCustomers, timeline }
}
