import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getCustomerOptions } from "@/lib/queries/interactions"
import { getItemOptionsWithPrices } from "@/lib/queries/sales"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
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

  const [customers, items, statuses, members] = await Promise.all([
    getCustomerOptions(context.workspace.id),
    getItemOptionsWithPrices(context.workspace.id),
    getActiveOptions(context.workspace.id, "sale_status"),
    getWorkspaceMembers(context.workspace.id),
  ])

  const defaultStatus = statuses.find((s) => s.is_default)

  // Costs are owner-only, and the form is a client component — strip
  // them out entirely so they never reach a salesperson's browser.
  const showFinancials = canViewFinancials(context.role)
  const itemOptions = showFinancials
    ? items
    : items.map((item) => ({ id: item.id, name: item.name, sellingPrice: item.sellingPrice }))

  return (
    <div>
      <PageHeader title="Record Sale" description="Log a completed or pending sale." />
      <SaleForm
        mode="create"
        currency={context.workspace.currency ?? "MMK"}
        defaultValues={{
          customerId: typeof params.customer === "string" ? params.customer : "",
          itemId: typeof params.item === "string" ? params.item : "",
          statusOptionId: defaultStatus?.id ?? "",
        }}
        customers={customers}
        items={itemOptions}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
        showFinancials={showFinancials}
      />
    </div>
  )
}
