import type { Metadata } from "next"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import {
  getCustomerOptions,
  getItemOptions,
} from "@/lib/queries/interactions"
import { PageHeader } from "@/components/layout/page-header"
import { TaskForm } from "@/components/forms/task-form"

export const metadata: Metadata = {
  title: "Create Task — Atlas",
}

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()

  const [statuses, priorities, customers, items, members] = await Promise.all([
    getActiveOptions(context.workspace.id, "task_status"),
    getActiveOptions(context.workspace.id, "task_priority"),
    getCustomerOptions(context.workspace.id),
    getItemOptions(context.workspace.id),
    getWorkspaceMembers(context.workspace.id),
  ])

  return (
    <div>
      <PageHeader
        title="Create Task"
        description="A follow-up or piece of internal work."
      />
      <TaskForm
        mode="create"
        defaultValues={{
          // Spec defaults: assigned to me, To Do, Medium.
          assignedTo: context.userId,
          statusOptionId: statuses.find((s) => s.is_default)?.id ?? "",
          priorityOptionId: priorities.find((p) => p.is_default)?.id ?? "",
          customerId:
            typeof params.customer === "string" ? params.customer : "",
          itemId: typeof params.item === "string" ? params.item : "",
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
