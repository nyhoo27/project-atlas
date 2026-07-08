import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil, MessagesSquare, Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import {
  getCustomerById,
  getCustomerRelated,
} from "@/lib/queries/customers"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canArchive, canDeleteCustomer, canEditCustomer } from "@/lib/permissions"
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { Timeline } from "@/components/timeline/timeline"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArchiveCustomerButton,
  DeleteCustomerButton,
} from "@/components/customers/customer-actions"
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
  title: "Customer — Atlas",
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const customer = await getCustomerById(context.workspace.id, id)
  if (!customer) notFound()

  const [related, members] = await Promise.all([
    getCustomerRelated(context.workspace.id, id),
    getWorkspaceMembers(context.workspace.id),
  ])
  const memberName = new Map(members.map((m) => [m.userId, m.fullName]))

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={
          customer.source
            ? `Source: ${customer.source.label}`
            : "No source recorded"
        }
        actions={
          <>
            <Button
              render={<Link href={`/app/interactions/new?customer=${customer.id}`} />}
            >
              <MessagesSquare className="size-4" />
              Log Interaction
            </Button>
            <Button
              variant="outline"
              render={<Link href={`/app/tasks/new?customer=${customer.id}`} />}
            >
              <Plus className="size-4" />
              Add Task
            </Button>
            {canEditCustomer(context.role) && (
              <Button
                variant="outline"
                render={<Link href={`/app/customers/${customer.id}/edit`} />}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {canArchive(context.role) && !customer.archived_at && (
              <ArchiveCustomerButton
                customerId={customer.id}
                customerName={customer.name}
              />
            )}
            {canDeleteCustomer(context.role) &&
              related.interactions.length === 0 && (
                <DeleteCustomerButton
                  customerId={customer.id}
                  customerName={customer.name}
                />
              )}
          </>
        }
      />

      {customer.archived_at && (
        <Badge variant="outline" className="mb-4">
          Archived {formatDate(customer.archived_at, timezone)}
        </Badge>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="interactions">
            Interactions ({related.interactions.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({related.tasks.length})</TabsTrigger>
          <TabsTrigger value="items">
            Linked Items ({related.linkedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="grid grid-cols-1 gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
              <Field label="Phone">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Email">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="hover:underline">
                    {customer.email}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Facebook">{customer.facebook ?? "—"}</Field>
              <Field label="WhatsApp">{customer.whatsapp ?? "—"}</Field>
              <Field label="Address">{customer.address ?? "—"}</Field>
              <Field label="Assigned to">
                {customer.assigned_to
                  ? (memberName.get(customer.assigned_to) ?? "Unknown")
                  : "Unassigned"}
              </Field>
              <Field label="Created">
                {formatDateTime(customer.created_at, timezone)}
              </Field>
              <Field label="Last updated">
                {formatRelative(customer.updated_at, timezone)}
              </Field>
              {customer.notes && (
                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <span className="whitespace-pre-wrap">{customer.notes}</span>
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
            <EmptyState message="No interactions logged yet. Log the first call, message, visit, or meeting." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Item</TableHead>
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
                      <TableCell>{interaction.summary}</TableCell>
                      <TableCell>
                        {interaction.item ? (
                          <Link
                            href={`/app/items/${interaction.item.id}`}
                            className="hover:underline"
                          >
                            {interaction.item.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
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

        <TabsContent value="tasks" className="mt-4">
          {related.tasks.length === 0 ? (
            <EmptyState message="No tasks for this customer yet." />
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          {related.linkedItems.length === 0 ? (
            <EmptyState message="No linked items yet. Items appear here when interactions mention them." />
          ) : (
            <ul className="space-y-2">
              {related.linkedItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/app/items/${item.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
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
