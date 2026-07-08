import "server-only"
import { createClient } from "@/lib/supabase/server"

export type CustomerListRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  created_at: string
  archived_at: string | null
  assigned_to: string | null
  source: { label: string; color: string | null } | null
}

export type CustomerListFilters = {
  search?: string
  sourceOptionId?: string
  assignedTo?: string
  showArchived?: boolean
}

export async function getCustomers(
  workspaceId: string,
  filters: CustomerListFilters
): Promise<CustomerListRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("customers")
    .select(
      `id, name, phone, email, created_at, archived_at, assigned_to,
       source:settings_options(label, color)`
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (!filters.showArchived) {
    query = query.is("archived_at", null)
  }
  if (filters.sourceOptionId) {
    query = query.eq("source_option_id", filters.sourceOptionId)
  }
  if (filters.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo)
  }
  if (filters.search) {
    // Strip characters PostgREST uses as syntax in .or() filters.
    const term = filters.search.replace(/[,()]/g, " ").trim()
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,facebook.ilike.%${term}%,whatsapp.ilike.%${term}%`
      )
    }
  }

  const { data } = await query
  return (data ?? []) as CustomerListRow[]
}

export type CustomerDetail = {
  id: string
  name: string
  phone: string | null
  email: string | null
  facebook: string | null
  whatsapp: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  assigned_to: string | null
  created_by: string | null
  source_option_id: string | null
  source: { label: string; color: string | null } | null
}

export async function getCustomerById(
  workspaceId: string,
  customerId: string
): Promise<CustomerDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customers")
    .select(
      `id, name, phone, email, facebook, whatsapp, address, notes,
       created_at, updated_at, archived_at, assigned_to, created_by,
       source_option_id, source:settings_options(label, color)`
    )
    .eq("workspace_id", workspaceId)
    .eq("id", customerId)
    .maybeSingle()
  return data as CustomerDetail | null
}

export type CustomerInteraction = {
  id: string
  summary: string
  notes: string | null
  direction: string | null
  interaction_at: string
  next_follow_up_at: string | null
  type: { label: string } | null
  item: { id: string; name: string } | null
}

export type CustomerTask = {
  id: string
  title: string
  due_at: string | null
  completed_at: string | null
  created_at: string
  assigned_to: string | null
  status: { value: string; label: string } | null
  priority: { label: string } | null
}

export type TimelineEntry = {
  id: string
  kind: "activity" | "interaction" | "task"
  description: string
  timestamp: string
}

/**
 * Everything the customer detail tabs need: interactions, tasks, linked
 * items (from interactions), and a merged timeline of activity logs,
 * interactions, and tasks, newest first.
 */
export async function getCustomerRelated(
  workspaceId: string,
  customerId: string
): Promise<{
  interactions: CustomerInteraction[]
  tasks: CustomerTask[]
  linkedItems: { id: string; name: string }[]
  timeline: TimelineEntry[]
}> {
  const supabase = await createClient()

  const [interactionsResult, tasksResult, activityResult] = await Promise.all([
    supabase
      .from("interactions")
      .select(
        `id, summary, notes, direction, interaction_at, next_follow_up_at,
         type:settings_options(label),
         item:items(id, name)`
      )
      .eq("workspace_id", workspaceId)
      .eq("customer_id", customerId)
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
      .eq("customer_id", customerId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("activity_logs")
      .select("id, description, created_at")
      .eq("workspace_id", workspaceId)
      .eq("record_type", "customer")
      .eq("record_id", customerId)
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const interactions = (interactionsResult.data ?? []) as CustomerInteraction[]
  const tasks = (tasksResult.data ?? []) as CustomerTask[]

  // Distinct items this customer has asked about, via interactions.
  const linkedItems = Array.from(
    new Map(
      interactions
        .filter((i) => i.item !== null)
        .map((i) => [i.item!.id, i.item!])
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
  ]
    .filter((entry) => entry.timestamp)
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

  return { interactions, tasks, linkedItems, timeline }
}
