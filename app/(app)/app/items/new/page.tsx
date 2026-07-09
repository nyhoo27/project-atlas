import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { canCreateItem } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { ItemForm } from "@/components/forms/item-form"

export const metadata: Metadata = {
  title: "Add Item — Atlas",
}

export default async function NewItemPage() {
  const context = await requireWorkspaceContext()
  if (!canCreateItem(context.role)) {
    redirect("/app/items")
  }

  const [categories, statuses] = await Promise.all([
    getActiveOptions(context.workspace.id, "item_category"),
    getActiveOptions(context.workspace.id, "item_status"),
  ])

  // Default new items to the workspace's default status (e.g. Available).
  const defaultStatus = statuses.find((status) => status.is_default)

  return (
    <div>
      <PageHeader title="Add Item" description="Something your business sells." />
      <ItemForm
        mode="create"
        currency={context.workspace.currency ?? "MMK"}
        defaultValues={
          defaultStatus ? { statusOptionId: defaultStatus.id } : undefined
        }
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
      />
    </div>
  )
}
