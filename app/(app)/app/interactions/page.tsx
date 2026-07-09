import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import {
  getInteractions,
  getCustomerOptions,
  getItemOptions,
} from "@/lib/queries/interactions"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canArchive } from "@/lib/permissions"
import { formatDateTime } from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { ArchiveInteractionButton } from "@/components/interactions/interaction-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Interactions — Atlas",
}

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const search = typeof params.q === "string" ? params.q : ""
  const typeFilter = typeof params.type === "string" ? params.type : ""
  const customerFilter = typeof params.customer === "string" ? params.customer : ""
  const itemFilter = typeof params.item === "string" ? params.item : ""
  const createdByFilter = typeof params.by === "string" ? params.by : ""

  const [interactions, types, customers, items, members] = await Promise.all([
    getInteractions(context.workspace.id, {
      search,
      typeOptionId: typeFilter || undefined,
      customerId: customerFilter || undefined,
      itemId: itemFilter || undefined,
      createdBy: createdByFilter || undefined,
    }),
    getActiveOptions(context.workspace.id, "interaction_type"),
    getCustomerOptions(context.workspace.id),
    getItemOptions(context.workspace.id),
    getWorkspaceMembers(context.workspace.id),
  ])

  const memberName = new Map(members.map((m) => [m.userId, m.fullName]))
  const hasFilters = Boolean(
    search || typeFilter || customerFilter || itemFilter || createdByFilter
  )

  return (
    <div>
      <PageHeader
        title="Interactions"
        description="Every call, message, visit, and meeting — logged."
        actions={
          <Button render={<Link href="/app/interactions/new" />}>
            <Plus className="size-4" />
            Log Interaction
          </Button>
        }
      />

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search summary or notes..."
          className="w-full sm:w-56"
        />
        <NativeSelect name="type" defaultValue={typeFilter} className="w-36">
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="customer" defaultValue={customerFilter} className="w-40">
          <option value="">All customers</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="item" defaultValue={itemFilter} className="w-40">
          <option value="">All items</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="by" defaultValue={createdByFilter} className="w-36">
          <option value="">Anyone</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/app/interactions" />}
          >
            Clear
          </Button>
        )}
      </form>

      {interactions.length === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No interactions match these filters."
              : "No interactions logged yet. Log the first call, message, visit, or meeting."
          }
          action={
            !hasFilters && (
              <Button render={<Link href="/app/interactions/new" />}>
                <Plus className="size-4" />
                Log Interaction
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Next Follow-up</TableHead>
                {canArchive(context.role) && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions.map((interaction) => (
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
                        className="font-medium hover:underline"
                      >
                        {interaction.customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
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
                  <TableCell className="max-w-72 truncate">
                    {interaction.summary}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {interaction.created_by
                      ? (memberName.get(interaction.created_by) ?? "Unknown")
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {interaction.next_follow_up_at
                      ? formatDateTime(interaction.next_follow_up_at, timezone)
                      : "—"}
                  </TableCell>
                  {canArchive(context.role) && (
                    <TableCell>
                      <ArchiveInteractionButton
                        interactionId={interaction.id}
                        summary={interaction.summary}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
