import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil, MessagesSquare, Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getItemById, getItemRelated } from "@/lib/queries/items"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { getSalesByItem, type SaleListRow } from "@/lib/queries/sales"
import {
  canArchive,
  canCreateSale,
  canEditItem,
  canModifySale,
} from "@/lib/permissions"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
} from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { Timeline } from "@/components/timeline/timeline"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArchiveItemButton } from "@/components/items/item-actions"
import { SalesTable } from "@/components/sales/sales-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Item — Atlas",
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()
  const timezone = context.workspace.timezone ?? "Asia/Yangon"
  const currency = context.workspace.currency ?? "MMK"

  const item = await getItemById(context.workspace.id, id)
  if (!item) notFound()

  const [related, members, sales] = await Promise.all([
    getItemRelated(context.workspace.id, id),
    getWorkspaceMembers(context.workspace.id),
    getSalesByItem(context.workspace.id, id),
  ])
  const memberName = new Map(members.map((m) => [m.userId, m.fullName]))

  return (
    <div>
      <PageHeader
        title={item.name}
        description={item.reference_code ?? undefined}
        actions={
          <>
            <Button render={<Link href={`/app/interactions/new?item=${item.id}`} />}>
              <MessagesSquare className="size-4" />
              Log Interaction
            </Button>
            <Button
              variant="outline"
              render={<Link href={`/app/tasks/new?item=${item.id}`} />}
            >
              <Plus className="size-4" />
              Add Task
            </Button>
            {canCreateSale(context.role) && (
              <Button
                variant="outline"
                render={<Link href={`/app/sales/new?item=${item.id}`} />}
              >
                <Plus className="size-4" />
                Record Sale
              </Button>
            )}
            {canEditItem(context.role) && (
              <Button
                variant="outline"
                render={<Link href={`/app/items/${item.id}/edit`} />}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {canArchive(context.role) && !item.archived_at && (
              <ArchiveItemButton itemId={item.id} itemName={item.name} />
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {item.category && <Badge variant="secondary">{item.category.label}</Badge>}
        {item.status && <Badge variant="outline">{item.status.label}</Badge>}
        {item.archived_at && (
          <Badge variant="outline">
            Archived {formatDate(item.archived_at, timezone)}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="interactions">
            Interactions ({related.interactions.length})
          </TabsTrigger>
          <TabsTrigger value="customers">
            Interested Customers ({related.interestedCustomers.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({related.tasks.length})</TabsTrigger>
          <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="grid grid-cols-1 gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
              <Field label="Selling price">
                {formatCurrency(item.selling_price, currency)}
              </Field>
              <Field label="Cost price">
                {formatCurrency(item.cost_price, currency)}
                {item.cost_breakdown.length > 0 && (
                  <span className="mt-1 block space-y-0.5 text-xs text-muted-foreground">
                    {item.cost_breakdown.map((component, index) => (
                      <span key={index} className="flex justify-between gap-4">
                        <span>{component.label}</span>
                        <span className="tabular-nums">
                          {formatCurrency(component.amount, currency)}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </Field>
              <Field label="Quantity">{item.quantity}</Field>
              <Field label="Location">{item.location ?? "—"}</Field>
              <Field label="Created">
                {formatDateTime(item.created_at, timezone)}
              </Field>
              <Field label="Last updated">
                {formatRelative(item.updated_at, timezone)}
              </Field>
              {item.description && (
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <span className="whitespace-pre-wrap">{item.description}</span>
                  </Field>
                </div>
              )}
              {item.notes && (
                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <span className="whitespace-pre-wrap">{item.notes}</span>
                  </Field>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Timeline
            entries={related.timeline}
            timezone={timezone}
            emptyMessage="No history yet. Interactions, tasks, and changes will show up here."
          />
        </TabsContent>

        <TabsContent value="interactions" className="mt-4">
          {related.interactions.length === 0 ? (
            <EmptyState message="No interactions mention this item yet." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Next follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {related.interactions.map((interaction) => (
                    <TableRow key={interaction.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(interaction.interaction_at, timezone)}
                      </TableCell>
                      <TableCell>
                        {interaction.type ? (
                          <Badge variant="secondary">{interaction.type.label}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {interaction.customer ? (
                          <Link
                            href={`/app/customers/${interaction.customer.id}`}
                            className="hover:underline"
                          >
                            {interaction.customer.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{interaction.summary}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {interaction.next_follow_up_at
                          ? formatDateTime(interaction.next_follow_up_at, timezone)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          {related.interestedCustomers.length === 0 ? (
            <EmptyState message="No interested customers yet. Customers appear here when interactions link them to this item." />
          ) : (
            <ul className="space-y-2">
              {related.interestedCustomers.map((customer) => (
                <li key={customer.id}>
                  <Link
                    href={`/app/customers/${customer.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {customer.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          {related.tasks.length === 0 ? (
            <EmptyState message="No tasks for this item yet." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {related.tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        {task.assigned_to
                          ? (memberName.get(task.assigned_to) ?? "Unknown")
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {task.due_at ? formatDateTime(task.due_at, timezone) : "—"}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          {sales.length === 0 ? (
            <EmptyState message="No sales of this item yet." />
          ) : (
            <SalesTable
              sales={sales}
              currency={currency}
              timezone={timezone}
              memberName={memberName}
              showItem={false}
              canEdit={(sale: SaleListRow) =>
                canModifySale(context.role, context.userId, {
                  created_by: null,
                  sold_by: sale.sold_by,
                })
              }
              canArchive={canArchive(context.role)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  )
}
