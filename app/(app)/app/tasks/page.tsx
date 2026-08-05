import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getTasks, type TaskListRow } from "@/lib/queries/tasks"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canArchive, canModifyTask } from "@/lib/permissions"
import { formatDateTime, todayRange } from "@/lib/utils/format"
import { getPage } from "@/lib/utils/pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { TaskRowActions } from "@/components/tasks/task-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Tasks — Atlas",
}

type Section = { key: string; label: string; tasks: TaskListRow[] }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const search = typeof params.q === "string" ? params.q : ""
  const statusFilter = typeof params.status === "string" ? params.status : ""
  const priorityFilter = typeof params.priority === "string" ? params.priority : ""
  const assignedFilter = typeof params.assigned === "string" ? params.assigned : ""
  // Dashboard stat cards link here with these:
  const onlyDueToday = params.due === "today"
  const onlyOverdue = params.overdue === "true"

  const page = getPage(params.page)
  const [{ rows: tasks, total }, statuses, priorities, members] = await Promise.all([
    getTasks(context.workspace.id, {
      search,
      statusOptionId: statusFilter || undefined,
      priorityOptionId: priorityFilter || undefined,
      assignedTo: assignedFilter || undefined,
      page,
    }),
    getActiveOptions(context.workspace.id, "task_status"),
    getActiveOptions(context.workspace.id, "task_priority"),
    getWorkspaceMembers(context.workspace.id),
  ])

  const memberName = new Map(members.map((m) => [m.userId, m.fullName]))

  // Group into the four sections.
  const { start, end } = todayRange(timezone)
  const now = new Date()

  const isClosed = (task: TaskListRow) =>
    task.completed_at !== null ||
    task.status?.value === "done" ||
    task.status?.value === "cancelled"

  const open = tasks.filter((t) => !isClosed(t))
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at) < now)
  const dueToday = open.filter((t) => {
    if (!t.due_at) return false
    const due = new Date(t.due_at)
    return due >= now && due >= start && due < end
  })
  const upcoming = open.filter(
    (t) => !overdue.includes(t) && !dueToday.includes(t)
  )
  const completed = tasks.filter(isClosed)

  const sections: Section[] = (
    [
      { key: "overdue", label: "Overdue", tasks: overdue },
      { key: "today", label: "Due Today", tasks: dueToday },
      { key: "upcoming", label: "Upcoming", tasks: upcoming },
      { key: "completed", label: "Completed", tasks: completed },
    ] as Section[]
  ).filter((section) => {
    if (onlyOverdue) return section.key === "overdue"
    if (onlyDueToday) return section.key === "today"
    return true
  })

  const hasFilters = Boolean(
    search || statusFilter || priorityFilter || assignedFilter || onlyDueToday || onlyOverdue
  )
  const totalShown = sections.reduce((sum, s) => sum + s.tasks.length, 0)

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Follow-ups and internal work, so nothing slips."
        actions={
          <Button render={<Link href="/app/tasks/new" />}>
            <Plus className="size-4" />
            Create Task
          </Button>
        }
      />

      <form method="GET" className="mb-6 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search title or description..."
          className="w-full sm:w-56"
        />
        <NativeSelect name="assigned" defaultValue={assignedFilter} className="w-40">
          <option value="">Anyone</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={statusFilter} className="w-36">
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="priority" defaultValue={priorityFilter} className="w-36">
          <option value="">All priorities</option>
          {priorities.map((priority) => (
            <option key={priority.id} value={priority.id}>
              {priority.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" render={<Link href="/app/tasks" />}>
            Clear
          </Button>
        )}
      </form>

      {totalShown === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No tasks match these filters."
              : "No tasks due. You are all caught up."
          }
          action={
            !hasFilters && (
              <Button render={<Link href="/app/tasks/new" />}>
                <Plus className="size-4" />
                Create Task
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {sections
            .filter((section) => section.tasks.length > 0)
            .map((section) => (
              <section key={section.key}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                  <Badge
                    variant={section.key === "overdue" ? "destructive" : "secondary"}
                  >
                    {section.tasks.length}
                  </Badge>
                </h2>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-40" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="max-w-64">
                            <p className="truncate font-medium">{task.title}</p>
                            {task.description && (
                              <p className="truncate text-xs text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.customer ? (
                              <Link
                                href={`/app/customers/${task.customer.id}`}
                                className="hover:underline"
                              >
                                {task.customer.name}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {task.item ? (
                              <Link
                                href={`/app/items/${task.item.id}`}
                                className="hover:underline"
                              >
                                {task.item.name}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {task.assigned_to
                              ? (memberName.get(task.assigned_to) ?? "Unknown")
                              : "—"}
                          </TableCell>
                          <TableCell
                            className={
                              section.key === "overdue"
                                ? "whitespace-nowrap font-medium text-destructive"
                                : "whitespace-nowrap text-muted-foreground"
                            }
                          >
                            {task.due_at
                              ? formatDateTime(task.due_at, timezone)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {task.priority ? (
                              <Badge variant="outline">{task.priority.label}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {task.completed_at ? (
                              <Badge variant="secondary">Done</Badge>
                            ) : task.status ? (
                              <Badge variant="outline">{task.status.label}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <TaskRowActions
                              taskId={task.id}
                              title={task.title}
                              isDone={isClosed(task)}
                              canModify={canModifyTask(context.role, context.userId, task)}
                              canArchive={canArchive(context.role)}
                              customerId={task.customer?.id ?? null}
                              itemId={task.item?.id ?? null}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ))}
        </div>
      )}

      <PaginationControls
        page={page}
        total={total}
        basePath="/app/tasks"
        searchParams={params}
        label="tasks"
      />
    </div>
  )
}
