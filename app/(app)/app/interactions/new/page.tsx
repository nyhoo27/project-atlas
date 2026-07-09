import type { Metadata } from "next"
import { requireWorkspaceContext } from "@/lib/queries/current"
import {
  getCustomerOptions,
  getItemOptions,
} from "@/lib/queries/interactions"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { getWorkspaceMembers } from "@/lib/queries/members"
import { PageHeader } from "@/components/layout/page-header"
import { InteractionForm } from "@/components/forms/interaction-form"

export const metadata: Metadata = {
  title: "Log Interaction — Atlas",
}

export default async function NewInteractionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()

  const [customers, items, types, members] = await Promise.all([
    getCustomerOptions(context.workspace.id),
    getItemOptions(context.workspace.id),
    getActiveOptions(context.workspace.id, "interaction_type"),
    getWorkspaceMembers(context.workspace.id),
  ])

  return (
    <div>
      <PageHeader
        title="Log Interaction"
        description="No customer conversation should go unlogged."
      />
      <InteractionForm
        customers={customers}
        items={items}
        types={types.map((t) => ({ id: t.id, label: t.label }))}
        members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
        currentUserId={context.userId}
        defaultCustomerId={
          typeof params.customer === "string" ? params.customer : undefined
        }
        defaultItemId={typeof params.item === "string" ? params.item : undefined}
      />
    </div>
  )
}
