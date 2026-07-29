import "server-only"
import { createClient } from "@/lib/supabase/server"
import { todayRange } from "@/lib/utils/format"

/**
 * Everything the dashboard needs in one round of parallel queries.
 * RLS scopes results to workspaces the user belongs to; the explicit
 * workspace_id filter keeps queries fast and future-proof for
 * multi-workspace users.
 */

export type DashboardTask = {
  id: string
  title: string
  due_at: string | null
  assigned_to: string | null
  customer: { id: string; name: string } | null
  item: { id: string; name: string } | null
  status: { value: string; label: string } | null
  priority: { value: string; label: string } | null
}

export type DashboardData = {
  activeCustomers: number
  activeItems: number
  dueTodayCount: number
  overdueCount: number
  myTasks: DashboardTask[]
  recentCustomers: {
    id: string
    name: string
    phone: string | null
    created_at: string
  }[]
  recentItems: {
    id: string
    name: string
    reference_code: string | null
    created_at: string
  }[]
  recentActivity: {
    id: string
    description: string
    created_at: string
  }[]
}

export async function getDashboardData(
  workspaceId: string,
  userId: string,
  timezone: string,
  /**
   * Record types to leave out of the activity feed. Activity
   * descriptions name the record ("added supplier Yangon Auto
   * Imports"), so restricted records must be filtered here too —
   * otherwise the feed leaks what the pages hide.
   */
  excludeActivityRecordTypes: string[] = []
): Promise<DashboardData> {
  const supabase = await createClient()

  let activityQuery = supabase
    .from("activity_logs")
    .select("id, description, created_at")
    .eq("workspace_id", workspaceId)
  if (excludeActivityRecordTypes.length > 0) {
    activityQuery = activityQuery.not(
      "record_type",
      "in",
      `(${excludeActivityRecordTypes.join(",")})`
    )
  }

  const [
    customersResult,
    itemsResult,
    tasksResult,
    recentCustomersResult,
    recentItemsResult,
    recentActivityResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("archived_at", null),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("archived_at", null),
    // Open tasks: due-today/overdue counts and the "My Tasks" section are
    // derived from this one fetch. V1 workspaces are small, so fetching
    // open tasks and counting in code stays simple and correct.
    supabase
      .from("tasks")
      .select(
        `id, title, due_at, assigned_to,
         customer:customers(id, name),
         item:items(id, name),
         status:settings_options!tasks_status_option_id_fkey(value, label),
         priority:settings_options!tasks_priority_option_id_fkey(value, label)`
      )
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .is("completed_at", null)
      .limit(500),
    supabase
      .from("customers")
      .select("id, name, phone, created_at")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("items")
      .select("id, name, reference_code, created_at")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    activityQuery.order("created_at", { ascending: false }).limit(8),
  ])

  const openTasks = (tasksResult.data ?? []).filter(
    (task) =>
      task.status?.value !== "done" && task.status?.value !== "cancelled"
  ) as DashboardTask[]

  const { start, end } = todayRange(timezone)
  const now = new Date()

  const overdue = openTasks.filter(
    (task) => task.due_at && new Date(task.due_at) < now
  )
  const dueToday = openTasks.filter((task) => {
    if (!task.due_at) return false
    const due = new Date(task.due_at)
    return due >= now && due >= start && due < end
  })

  const myTasks = openTasks
    .filter((task) => task.assigned_to === userId)
    .sort((a, b) => {
      // Soonest due first; tasks without a due date go last.
      if (!a.due_at) return b.due_at ? 1 : 0
      if (!b.due_at) return -1
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    })
    .slice(0, 6)

  return {
    activeCustomers: customersResult.count ?? 0,
    activeItems: itemsResult.count ?? 0,
    dueTodayCount: dueToday.length,
    overdueCount: overdue.length,
    myTasks,
    recentCustomers: recentCustomersResult.data ?? [],
    recentItems: recentItemsResult.data ?? [],
    recentActivity: recentActivityResult.data ?? [],
  }
}
