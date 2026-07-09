import "server-only"
import { createClient } from "@/lib/supabase/server"

export type TaskListRow = {
  id: string
  title: string
  description: string | null
  due_at: string | null
  completed_at: string | null
  created_at: string
  created_by: string | null
  assigned_to: string | null
  status: { value: string; label: string } | null
  priority: { value: string; label: string } | null
  customer: { id: string; name: string } | null
  item: { id: string; name: string } | null
}

export type TaskListFilters = {
  search?: string
  statusOptionId?: string
  priorityOptionId?: string
  assignedTo?: string
}

export async function getTasks(
  workspaceId: string,
  filters: TaskListFilters
): Promise<TaskListRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("tasks")
    .select(
      `id, title, description, due_at, completed_at, created_at, created_by, assigned_to,
       status:settings_options!tasks_status_option_id_fkey(value, label),
       priority:settings_options!tasks_priority_option_id_fkey(value, label),
       customer:customers(id, name),
       item:items(id, name)`
    )
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(300)

  if (filters.statusOptionId) {
    query = query.eq("status_option_id", filters.statusOptionId)
  }
  if (filters.priorityOptionId) {
    query = query.eq("priority_option_id", filters.priorityOptionId)
  }
  if (filters.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo)
  }
  if (filters.search) {
    const term = filters.search.replace(/[,()]/g, " ").trim()
    if (term) {
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
    }
  }

  const { data } = await query
  return (data ?? []) as TaskListRow[]
}

export type TaskDetail = {
  id: string
  title: string
  description: string | null
  due_at: string | null
  completed_at: string | null
  created_by: string | null
  assigned_to: string | null
  status_option_id: string | null
  priority_option_id: string | null
  customer_id: string | null
  item_id: string | null
}

export async function getTaskById(
  workspaceId: string,
  taskId: string
): Promise<TaskDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tasks")
    .select(
      `id, title, description, due_at, completed_at, created_by, assigned_to,
       status_option_id, priority_option_id, customer_id, item_id`
    )
    .eq("workspace_id", workspaceId)
    .eq("id", taskId)
    .maybeSingle()
  return data
}
