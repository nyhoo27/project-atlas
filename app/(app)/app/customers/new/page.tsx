import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { canCreateCustomer } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { CustomerForm } from "@/components/forms/customer-form"

export const metadata: Metadata = {
  title: "Add Customer — Atlas",
}

export default async function NewCustomerPage() {
  const context = await requireWorkspaceContext()
  if (!canCreateCustomer(context.role)) {
    redirect("/app/customers")
  }

  const [sources, members] = await Promise.all([
    getActiveOptions(context.workspace.id, "customer_source"),
    getWorkspaceMembers(context.workspace.id),
  ])

  return (
    <div>
      <PageHeader
        title="Add Customer"
        description="Every conversation starts with a customer record."
      />
      <CustomerForm
        mode="create"
        sources={sources.map((s) => ({ id: s.id, label: s.label }))}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
      />
    </div>
  )
}
