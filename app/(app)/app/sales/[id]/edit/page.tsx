import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getSaleById, getItemOptionsWithPrices } from "@/lib/queries/sales"
import { getCustomerOptions } from "@/lib/queries/interactions"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canModifySale } from "@/lib/permissions"
import { formatDateTime } from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { SaleForm } from "@/components/forms/sale-form"

export const metadata: Metadata = {
  title: "Edit Sale — Atlas",
}

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()

  const sale = await getSaleById(context.workspace.id, id)
  if (!sale) notFound()
  if (!canModifySale(context.role, context.userId, sale)) {
    redirect(`/app/sales/${id}`)
  }

  const [customers, items, statuses, members] = await Promise.all([
    getCustomerOptions(context.workspace.id),
    getItemOptionsWithPrices(context.workspace.id),
    getActiveOptions(context.workspace.id, "sale_status"),
    getWorkspaceMembers(context.workspace.id),
  ])

  return (
    <div>
      <PageHeader title={`Edit Sale — ${formatDateTime(sale.sold_at, context.workspace.timezone ?? "Asia/Yangon")}`} />
      <SaleForm
        mode="edit"
        saleId={sale.id}
        currency={context.workspace.currency ?? "MMK"}
        defaultValues={{
          customerId: sale.customer_id ?? "",
          itemId: sale.item_id ?? "",
          soldBy: sale.sold_by ?? "",
          statusOptionId: sale.status_option_id ?? "",
          salePrice: String(sale.sale_price),
          costPrice: sale.cost_price != null ? String(sale.cost_price) : "",
          quantity: String(sale.quantity),
          // Raw ISO; the form converts to the browser's local time.
          soldAt: sale.sold_at,
          notes: sale.notes ?? "",
        }}
        customers={customers}
        items={items}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
      />
    </div>
  )
}
