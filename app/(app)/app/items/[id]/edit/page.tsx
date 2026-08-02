import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getItemById } from "@/lib/queries/items"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { canEditItem } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { ItemForm } from "@/components/forms/item-form"

export const metadata: Metadata = {
  title: "Edit Item — Atlas",
}

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()
  if (!canEditItem(context.role)) {
    redirect(`/app/items/${id}`)
  }

  const item = await getItemById(context.workspace.id, id)
  if (!item) notFound()

  // Suppliers are searched as you type; the item's own supplier comes
  // along with the item itself.
  const [categories, statuses] = await Promise.all([
    getActiveOptions(context.workspace.id, "item_category"),
    getActiveOptions(context.workspace.id, "item_status"),
  ])

  return (
    <div>
      <PageHeader title={`Edit ${item.name}`} />
      <ItemForm
        mode="edit"
        itemId={item.id}
        currency={context.workspace.currency ?? "MMK"}
        defaultValues={{
          name: item.name,
          referenceCode: item.reference_code ?? "",
          categoryOptionId: item.category_option_id ?? "",
          statusOptionId: item.status_option_id ?? "",
          supplierId: item.supplier_id ?? "",
          description: item.description ?? "",
          costPrice: item.cost_price != null ? String(item.cost_price) : "",
          costBreakdown: item.cost_breakdown.map((component) => ({
            label: component.label,
            amount: String(component.amount),
          })),
          sellingPrice:
            item.selling_price != null ? String(item.selling_price) : "",
          quantity: String(item.quantity),
          location: item.location ?? "",
          notes: item.notes ?? "",
        }}
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        initialSupplierLabel={item.supplier?.name}
      />
    </div>
  )
}
