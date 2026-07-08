import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getCustomerById } from "@/lib/queries/customers"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canEditCustomer } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { CustomerForm } from "@/components/forms/customer-form"

export const metadata: Metadata = {
  title: "Edit Customer — Atlas",
}

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()
  if (!canEditCustomer(context.role)) {
    redirect(`/app/customers/${id}`)
  }

  const customer = await getCustomerById(context.workspace.id, id)
  if (!customer) notFound()

  const [sources, members] = await Promise.all([
    getActiveOptions(context.workspace.id, "customer_source"),
    getWorkspaceMembers(context.workspace.id),
  ])

  return (
    <div>
      <PageHeader title={`Edit ${customer.name}`} />
      <CustomerForm
        mode="edit"
        customerId={customer.id}
        defaultValues={{
          name: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          facebook: customer.facebook ?? "",
          whatsapp: customer.whatsapp ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
          sourceOptionId: customer.source_option_id ?? "",
          assignedTo: customer.assigned_to ?? "",
        }}
        sources={sources.map((s) => ({ id: s.id, label: s.label }))}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
      />
    </div>
  )
}
