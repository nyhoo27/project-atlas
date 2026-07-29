import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { getCustomerById } from "@/lib/queries/customers"
import { getItemById } from "@/lib/queries/items"
import { canCreateSale, canViewFinancials } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { SaleForm } from "@/components/forms/sale-form"

export const metadata: Metadata = {
  title: "Record Sale — Atlas",
}

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  if (!canCreateSale(context.role)) {
    redirect("/app/sales")
  }

  const customerId = typeof params.customer === "string" ? params.customer : ""
  const itemId = typeof params.item === "string" ? params.item : ""

  // Customers and items are searched as you type, so only the records
  // prefilled from the URL need loading up front.
  const [statuses, members, presetCustomer, presetItem] = await Promise.all([
    getActiveOptions(context.workspace.id, "sale_status"),
    getWorkspaceMembers(context.workspace.id),
    customerId
      ? getCustomerById(context.workspace.id, customerId)
      : Promise.resolve(null),
    itemId ? getItemById(context.workspace.id, itemId) : Promise.resolve(null),
  ])

  const defaultStatus = statuses.find((s) => s.is_default)

  return (
    <div>
      <PageHeader title="Record Sale" description="Log a completed or pending sale." />
      <SaleForm
        mode="create"
        currency={context.workspace.currency ?? "MMK"}
        defaultValues={{
          customerId: presetCustomer ? customerId : "",
          itemId: presetItem ? itemId : "",
          statusOptionId: defaultStatus?.id ?? "",
          salePrice:
            presetItem?.selling_price != null
              ? String(presetItem.selling_price)
              : "",
        }}
        initialCustomerLabel={presetCustomer?.name}
        initialItemLabel={presetItem?.name}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
        showFinancials={canViewFinancials(context.role)}
      />
    </div>
  )
}
