import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getSales, type SaleListRow } from "@/lib/queries/sales"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { getCustomerOptions, getItemOptions } from "@/lib/queries/interactions"
import {
  canArchive,
  canCreateSale,
  canModifySale,
  canViewFinancials,
} from "@/lib/permissions"
import { formatCurrency } from "@/lib/utils/format"
import { getPage } from "@/lib/utils/pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { SalesTable } from "@/components/sales/sales-table"

export const metadata: Metadata = {
  title: "Sales — Atlas",
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  const currency = context.workspace.currency ?? "MMK"
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const customerFilter = typeof params.customer === "string" ? params.customer : ""
  const itemFilter = typeof params.item === "string" ? params.item : ""
  const soldByFilter = typeof params.by === "string" ? params.by : ""
  const statusFilter = typeof params.status === "string" ? params.status : ""
  const showArchived = params.archived === "1"

  const page = getPage(params.page)
  const [{ rows: sales, total }, customers, items, statuses, members] = await Promise.all([
    getSales(context.workspace.id, {
      customerId: customerFilter || undefined,
      itemId: itemFilter || undefined,
      soldBy: soldByFilter || undefined,
      statusOptionId: statusFilter || undefined,
      showArchived,
      page,
    }),
    getCustomerOptions(context.workspace.id),
    getItemOptions(context.workspace.id),
    getActiveOptions(context.workspace.id, "sale_status"),
    getWorkspaceMembers(context.workspace.id),
  ])

  const memberName = new Map(members.map((m) => [m.userId, m.fullName]))
  const showFinancials = canViewFinancials(context.role)
  const hasFilters = Boolean(
    customerFilter || itemFilter || soldByFilter || statusFilter || showArchived
  )

  // Totals for the rows on this page only — summing every matching sale
  // would need a database aggregate, and quietly showing a partial
  // figure as if it were the total would be worse than labelling it.
  const totalRevenue = sales.reduce(
    (sum, s) => sum + Number(s.sale_price) * s.quantity,
    0
  )
  const totalProfit = sales.reduce(
    (sum, s) =>
      sum +
      (Number(s.sale_price) - (s.cost_price != null ? Number(s.cost_price) : 0)) *
        s.quantity,
    0
  )

  return (
    <div>
      <PageHeader
        title="Sales"
        description="What your business has sold."
        actions={
          canCreateSale(context.role) && (
            <Button render={<Link href="/app/sales/new" />}>
              <Plus className="size-4" />
              Record Sale
            </Button>
          )
        }
      />

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <NativeSelect name="item" defaultValue={itemFilter} className="w-40">
          <option value="">All items</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
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
        <NativeSelect name="by" defaultValue={soldByFilter} className="w-36">
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
          <Button variant="ghost" size="sm" render={<Link href="/app/sales" />}>
            Clear
          </Button>
        )}
      </form>

      {sales.length === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No sales match these filters."
              : "No sales recorded yet. Record your first sale to start tracking revenue and profit."
          }
          action={
            !hasFilters &&
            canCreateSale(context.role) && (
              <Button render={<Link href="/app/sales/new" />}>
                <Plus className="size-4" />
                Record Sale
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">
                {total.toLocaleString()} sale{total === 1 ? "" : "s"}
              </span>
            </div>
            {showFinancials && (
              <>
                <div>
                  <span className="text-muted-foreground">
                    Revenue on this page:{" "}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(totalRevenue, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Profit on this page:{" "}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(totalProfit, currency)}
                  </span>
                </div>
              </>
            )}
          </div>
          <SalesTable
            sales={sales}
            currency={currency}
            timezone={timezone}
            memberName={memberName}
            showProfit={showFinancials}
            canEdit={(sale: SaleListRow) =>
              canModifySale(context.role, context.userId, {
                created_by: null,
                sold_by: sale.sold_by,
              })
            }
            canArchive={canArchive(context.role)}
          />
        </>
      )}

      <PaginationControls
        page={page}
        total={total}
        basePath="/app/sales"
        searchParams={params}
        label="sales"
      />
    </div>
  )
}
