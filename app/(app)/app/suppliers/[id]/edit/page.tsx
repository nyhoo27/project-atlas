import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getSupplierById } from "@/lib/queries/suppliers"
import { canManageSuppliers } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { SupplierForm } from "@/components/forms/supplier-form"

export const metadata: Metadata = {
  title: "Edit Supplier — Atlas",
}

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()
  if (!canManageSuppliers(context.role)) {
    redirect("/app/dashboard")
  }

  const supplier = await getSupplierById(context.workspace.id, id)
  if (!supplier) notFound()

  return (
    <div>
      <PageHeader title={`Edit ${supplier.name}`} />
      <SupplierForm
        mode="edit"
        supplierId={supplier.id}
        defaultValues={{
          name: supplier.name,
          contactPerson: supplier.contact_person ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          notes: supplier.notes ?? "",
        }}
      />
    </div>
  )
}
