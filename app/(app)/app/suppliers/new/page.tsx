import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { canManageSuppliers } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { SupplierForm } from "@/components/forms/supplier-form"

export const metadata: Metadata = {
  title: "Add Supplier — Atlas",
}

export default async function NewSupplierPage() {
  const context = await requireWorkspaceContext()
  if (!canManageSuppliers(context.role)) {
    redirect("/app/dashboard")
  }

  return (
    <div>
      <PageHeader
        title="Add Supplier"
        description="A business you buy items from."
      />
      <SupplierForm mode="create" />
    </div>
  )
}
