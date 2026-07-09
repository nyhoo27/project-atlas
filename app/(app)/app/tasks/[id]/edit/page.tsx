import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getTaskById } from "@/lib/queries/tasks"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import {
  getCustomerOptions,
  getItemOptions,
} from "@/lib/queries/interactions"
import { canModifyTask } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { TaskForm } from "@/components/forms/task-form"

export const metadata: Metadata = {
  title: "Edit Task — Atlas",
}

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()

  const task = await getTaskById(context.workspace.id, id)
  if (!task) notFound()
  if (!canModifyTask(context.role, context.userId, task)) {
    redirect("/app/tasks")
  }

  const [statuses, priorities, customers, items, members] = await Promise.all([
    getActiveOptions(context.workspace.id, "task_status"),
    getActiveOptions(context.workspace.id, "task_priority"),
    getCustomerOptions(context.workspace.id),
    getItemOptions(context.workspace.id),
    getWorkspaceMembers(context.workspace.id),
  ])

  return (
    <div>
      <PageHeader title={`Edit ${task.title}`} />
      <TaskForm
        mode="edit"
        taskId={task.id}
        defaultValues={{
          title: task.title,
          description: task.description ?? "",
          assignedTo: task.assigned_to ?? "",
          dueAt: task.due_at ?? "",
          statusOptionId: task.status_option_id ?? "",
          priorityOptionId: task.priority_option_id ?? "",
          customerId: task.customer_id ?? "",
          itemId: task.item_id ?? "",
        }}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        priorities={priorities.map((p) => ({ id: p.id, label: p.label }))}
        customers={customers}
        items={items}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
      />
    </div>
  )
}
