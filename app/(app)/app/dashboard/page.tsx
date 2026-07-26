import type { Metadata } from "next"
import Link from "next/link"
import {
  Users,
  Package,
  CalendarClock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getDashboardData, type DashboardTask } from "@/lib/queries/dashboard"
import { getSalesSummary } from "@/lib/queries/sales"
import {
  formatCurrency,
  formatDateTime,
  formatRelative,
  todayRange,
} from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Dashboard — Atlas",
}

export default async function DashboardPage() {
  const { userId, profile, workspace } = await requireWorkspaceContext()
  const timezone = workspace.timezone ?? "Asia/Yangon"
  const currency = workspace.currency ?? "MMK"
  const [data, salesSummary] = await Promise.all([
    getDashboardData(workspace.id, userId, timezone),
    getSalesSummary(workspace.id, timezone),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile?.full_name ?? "there"}.`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active customers"
          value={data.activeCustomers}
          href="/app/customers"
          icon={Users}
        />
        <StatCard
          label="Active items"
          value={data.activeItems}
          href="/app/items"
          icon={Package}
        />
        <StatCard
          label="Tasks due today"
          value={data.dueTodayCount}
          href="/app/tasks?due=today"
          icon={CalendarClock}
        />
        <StatCard
          label="Overdue tasks"
          value={data.overdueCount}
          href="/app/tasks?overdue=true"
          icon={AlertTriangle}
          emphasis
        />
      </div>

      {/* This month's sales */}
      <Link href="/app/sales" className="block">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-3 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sales this month
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {salesSummary.monthCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Revenue this month
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {formatCurrency(salesSummary.monthRevenue, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Profit this month
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {formatCurrency(salesSummary.monthProfit, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="My Tasks" href="/app/tasks">
          {data.myTasks.length === 0 ? (
            <EmptyState message="No tasks due. You are all caught up." />
          ) : (
            <ul className="divide-y">
              {data.myTasks.map((task) => (
                <TaskRow key={task.id} task={task} timezone={timezone} />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent Activity" href="/app/dashboard">
          {data.recentActivity.length === 0 ? (
            <EmptyState message="No activity yet. Actions like adding customers and logging interactions will show up here." />
          ) : (
            <ul className="divide-y">
              {data.recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
                  <p className="text-sm">{entry.description}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(entry.created_at, timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent Customers" href="/app/customers">
          {data.recentCustomers.length === 0 ? (
            <EmptyState message="No customers yet. Add your first customer to start logging sales activity." />
          ) : (
            <ul className="divide-y">
              {data.recentCustomers.map((customer) => (
                <li key={customer.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(customer.created_at, timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent Items" href="/app/items">
          {data.recentItems.length === 0 ? (
            <EmptyState message="No items yet. Add the first item your business wants to sell." />
          ) : (
            <ul className="divide-y">
              {data.recentItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.reference_code && (
                      <p className="text-xs text-muted-foreground">
                        {item.reference_code}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(item.created_at, timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  href,
  children,
}: {
  title: string
  href: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function TaskRow({
  task,
  timezone,
}: {
  task: DashboardTask
  timezone: string
}) {
  const now = new Date()
  const { start, end } = todayRange(timezone)
  const due = task.due_at ? new Date(task.due_at) : null
  const isOverdue = due !== null && due < now
  const isDueToday = due !== null && !isOverdue && due >= start && due < end

  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="text-xs text-muted-foreground">
          {task.customer && <>{task.customer.name} · </>}
          {task.due_at ? formatDateTime(task.due_at, timezone) : "No due date"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
        {isDueToday && <Badge variant="secondary">Today</Badge>}
        {task.priority && (
          <Badge variant="outline">{task.priority.label}</Badge>
        )}
      </div>
    </li>
  )
}
