import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getSupplierOptions } from "@/lib/queries/suppliers"
import { canCreateItem } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { ItemForm } from "@/components/forms/item-form"

export const metadata: Metadata = {
  title: "Add Item — Atlas",
}

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  if (!canCreateItem(context.role)) {
    redirect("/app/items")
  }

  const [categories, statuses, suppliers] = await Promise.all([
    getActiveOptions(context.workspace.id, "item_category"),
    getActiveOptions(context.workspace.id, "item_status"),
    getSupplierOptions(context.workspace.id),
  ])

  // Default new items to the workspace's default status (e.g. Available).
  const defaultStatus = statuses.find((status) => status.is_default)

  return (
    <div>
      <PageHeader title="Add Item" description="Something your business sells." />
      <ItemForm
        mode="create"
        currency={context.workspace.currency ?? "MMK"}
        defaultValues={{
          ...(defaultStatus ? { statusOptionId: defaultStatus.id } : {}),
          // Prefilled by the "Add Item" button on a supplier's page.
          supplierId: typeof params.supplier === "string" ? params.supplier : "",
        }}
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        suppliers={suppliers.map((s) => ({ id: s.id, label: s.name }))}
      />
    </div>
  )
}
