import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getSaleById } from "@/lib/queries/sales"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canArchive, canModifySale } from "@/lib/permissions"
import {
  formatCurrency,
  formatDateTime,
  formatRelative,
} from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArchiveSaleButton } from "@/components/sales/sale-actions"

export const metadata: Metadata = {
  title: "Sale — Atlas",
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()
  const currency = context.workspace.currency ?? "MMK"
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const sale = await getSaleById(context.workspace.id, id)
  if (!sale) notFound()

  const members = await getWorkspaceMembers(context.workspace.id)
  const memberName = new Map(members.map((m) => [m.userId, m.fullName]))

  const total = Number(sale.sale_price) * sale.quantity
  const profit =
    (Number(sale.sale_price) - (sale.cost_price != null ? Number(sale.cost_price) : 0)) *
    sale.quantity
  const canEdit = canModifySale(context.role, context.userId, sale)

  return (
    <div>
      <PageHeader
        title={`Sale — ${formatDateTime(sale.sold_at, timezone)}`}
        description={sale.item ? sale.item.name : "No item"}
        actions={
          <>
            {canEdit && (
              <Button variant="outline" render={<Link href={`/app/sales/${sale.id}/edit`} />}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {canArchive(context.role) && !sale.archived_at && (
              <ArchiveSaleButton
                saleId={sale.id}
                label={`sale on ${formatDateTime(sale.sold_at, timezone)}`}
              />
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {sale.status && <Badge variant="secondary">{sale.status.label}</Badge>}
        {sale.archived_at && <Badge variant="outline">Archived</Badge>}
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
          <Field label="Item">
            {sale.item ? (
              <Link href={`/app/items/${sale.item.id}`} className="hover:underline">
                {sale.item.name}
              </Link>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Customer">
            {sale.customer ? (
              <Link href={`/app/customers/${sale.customer.id}`} className="hover:underline">
                {sale.customer.name}
              </Link>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Sale price (per unit)">
            {formatCurrency(Number(sale.sale_price), currency)}
          </Field>
          <Field label="Cost price (per unit)">
            {sale.cost_price != null ? formatCurrency(Number(sale.cost_price), currency) : "—"}
          </Field>
          <Field label="Quantity">{sale.quantity}</Field>
          <Field label="Total">
            <span className="font-semibold">{formatCurrency(total, currency)}</span>
          </Field>
          <Field label="Profit">
            {sale.cost_price != null ? (
              <span className="font-semibold">{formatCurrency(profit, currency)}</span>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Sold by">
            {sale.sold_by ? (memberName.get(sale.sold_by) ?? "Unknown") : "—"}
          </Field>
          <Field label="Sold on">{formatDateTime(sale.sold_at, timezone)}</Field>
          <Field label="Recorded">{formatRelative(sale.created_at, timezone)}</Field>
          {sale.notes && (
            <div className="sm:col-span-2">
              <Field label="Notes">
                <span className="whitespace-pre-wrap">{sale.notes}</span>
              </Field>
            </div>
          )}
        </CardContent>
      </Card>
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
