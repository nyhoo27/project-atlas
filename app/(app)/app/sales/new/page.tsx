import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getCustomerOptions } from "@/lib/queries/interactions"
import { getItemOptionsWithPrices } from "@/lib/queries/sales"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canCreateSale } from "@/lib/permissions"
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
        items={items}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
      />
    </div>
  )
}
