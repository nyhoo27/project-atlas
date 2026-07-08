import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getCustomers } from "@/lib/queries/customers"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canArchive, canCreateCustomer } from "@/lib/permissions"
import { formatDate } from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { CustomerRowActions } from "@/components/customers/customer-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Customers — Atlas",
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const search = typeof params.q === "string" ? params.q : ""
  const sourceFilter = typeof params.source === "string" ? params.source : ""
  const assignedFilter = typeof params.assigned === "string" ? params.assigned : ""
  const showArchived = params.archived === "1"

  const [customers, sources, members] = await Promise.all([
    getCustomers(context.workspace.id, {
      search,
      sourceOptionId: sourceFilter || undefined,
      assignedTo: assignedFilter || undefined,
      showArchived,
    }),
    getActiveOptions(context.workspace.id, "customer_source"),
    getWorkspaceMembers(context.workspace.id),
  ])

  const memberName = new Map(members.map((m) => [m.userId, m.fullName]))
  const hasFilters = Boolean(search || sourceFilter || assignedFilter || showArchived)

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People and companies your business talks to."
        actions={
          canCreateCustomer(context.role) && (
            <Button render={<Link href="/app/customers/new" />}>
              <Plus className="size-4" />
              Add Customer
            </Button>
          )
        }
      />

      {/* Filters — a plain GET form so the URL stays shareable */}
      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search name, phone, email..."
          className="w-full sm:w-64"
        />
        <NativeSelect name="source" defaultValue={sourceFilter} className="w-40">
          <option value="">All sources</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="assigned" defaultValue={assignedFilter} className="w-40">
          <option value="">Anyone</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="archived"
            value="1"
            defaultChecked={showArchived}
            className="size-4 accent-foreground"
          />
          Show archived
        </label>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/app/customers" />}
          >
            Clear
          </Button>
        )}
      </form>

      {customers.length === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No customers match these filters."
              : "No customers yet. Add your first customer to start tracking conversations and follow-ups."
          }
          action={
            !hasFilters &&
            canCreateCustomer(context.role) && (
              <Button render={<Link href="/app/customers/new" />}>
                <Plus className="size-4" />
                Add Customer
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/app/customers/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.name}
                    </Link>
                    {customer.archived_at && (
                      <Badge variant="outline" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.source ? (
                      <Badge variant="secondary">{customer.source.label}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.assigned_to
                      ? (memberName.get(customer.assigned_to) ?? "Unknown")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(customer.created_at, timezone)}
                  </TableCell>
                  <TableCell>
                    <CustomerRowActions
                      customerId={customer.id}
                      customerName={customer.name}
                      canArchive={canArchive(context.role) && !customer.archived_at}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
