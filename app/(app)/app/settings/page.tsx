import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getAllOptions, getTags } from "@/lib/queries/settings-manage"
import { getAllWorkspaceMembers } from "@/lib/queries/members"
import { canManageSettings, canManageMembers } from "@/lib/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspaceInfoForm } from "@/components/settings/workspace-info-form"
import { SettingsOptionManager } from "@/components/settings/settings-option-manager"
import { TagsManager } from "@/components/settings/tags-manager"
import { MembersManager } from "@/components/settings/members-manager"

export const metadata: Metadata = {
  title: "Settings — Atlas",
}

const OPTION_SECTIONS = [
  { type: "item_category", tab: "categories", label: "Item Categories", singular: "Category" },
  { type: "item_status", tab: "item-statuses", label: "Item Statuses", singular: "Status" },
  { type: "customer_source", tab: "sources", label: "Customer Sources", singular: "Source" },
  { type: "interaction_type", tab: "interaction-types", label: "Interaction Types", singular: "Type" },
  { type: "task_status", tab: "task-statuses", label: "Task Statuses", singular: "Status" },
  { type: "task_priority", tab: "priorities", label: "Task Priorities", singular: "Priority" },
] as const

export default async function SettingsPage() {
  const context = await requireWorkspaceContext()
  // Owner/Manager only — the sidebar hides the link for other roles,
  // but this is the authoritative check (plus every settings action
  // re-checks on the server).
  if (!canManageSettings(context.role)) {
    redirect("/app/dashboard")
  }

  const showMembers = canManageMembers(context.role)
  const [optionSets, tags, members] = await Promise.all([
    Promise.all(
      OPTION_SECTIONS.map((section) =>
        getAllOptions(context.workspace.id, section.type)
      )
    ),
    getTags(context.workspace.id),
    showMembers ? getAllWorkspaceMembers(context.workspace.id) : Promise.resolve([]),
  ])

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure Atlas for how your business works."
      />

      <Tabs defaultValue="workspace">
        <TabsList className="flex-wrap">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          {OPTION_SECTIONS.map((section) => (
            <TabsTrigger key={section.tab} value={section.tab}>
              {section.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="tags">Tags</TabsTrigger>
          {showMembers && <TabsTrigger value="members">Members</TabsTrigger>}
        </TabsList>

        <TabsContent value="workspace" className="mt-4">
          <WorkspaceInfoForm
            defaultValues={{
              name: context.workspace.name,
              currency: context.workspace.currency ?? "MMK",
              timezone: context.workspace.timezone ?? "Asia/Yangon",
            }}
          />
        </TabsContent>

        {OPTION_SECTIONS.map((section, index) => (
          <TabsContent key={section.tab} value={section.tab} className="mt-4">
            <SettingsOptionManager
              optionType={section.type}
              optionTypeLabel={section.singular}
              options={optionSets[index]}
            />
          </TabsContent>
        ))}

        <TabsContent value="tags" className="mt-4">
          <TagsManager tags={tags} />
        </TabsContent>

        {showMembers && (
          <TabsContent value="members" className="mt-4">
            <MembersManager members={members} currentUserId={context.userId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
