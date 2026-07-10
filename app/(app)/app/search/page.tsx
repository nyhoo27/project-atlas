import type { Metadata } from "next"
import Link from "next/link"
import { Users, Package, CheckSquare, MessagesSquare } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { globalSearch } from "@/lib/queries/search"
import { formatDateTime } from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Search — Atlas",
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const query = typeof params.q === "string" ? params.q.trim() : ""
  const results = query
    ? await globalSearch(context.workspace.id, query)
    : { customers: [], items: [], tasks: [], interactions: [] }

  const totalResults =
    results.customers.length +
    results.items.length +
    results.tasks.length +
    results.interactions.length

  return (
    <div>
      <PageHeader
        title="Search"
        description={
          query ? `Results for "${query}"` : "Type in the search box above to find records."
        }
      />

      {query && totalResults === 0 ? (
        <EmptyState message="No matching records found." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {results.customers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Customers
                  <Badge variant="secondary">{results.customers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {results.customers.map((customer) => (
                    <li key={customer.id} className="py-2">
                      <Link
                        href={`/app/customers/${customer.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {customer.name}
                      </Link>
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground">
                          {customer.phone}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="size-4" />
                  Items
                  <Badge variant="secondary">{results.items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {results.items.map((item) => (
                    <li key={item.id} className="py-2">
                      <Link
                        href={`/app/items/${item.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      {item.reference_code && (
                        <p className="text-xs text-muted-foreground">
                          {item.reference_code}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.tasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckSquare className="size-4" />
                  Tasks
                  <Badge variant="secondary">{results.tasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {results.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 py-2">
                      {/* Tasks have no detail page — link to the list
                          pre-filtered to this task's title. */}
                      <Link
                        href={`/app/tasks?q=${encodeURIComponent(task.title)}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {task.title}
                      </Link>
                      {task.completed_at && <Badge variant="secondary">Done</Badge>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.interactions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessagesSquare className="size-4" />
                  Interactions
                  <Badge variant="secondary">{results.interactions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {results.interactions.map((interaction) => (
                    <li key={interaction.id} className="py-2">
                      {/* Interactions live on the customer's page. */}
                      <Link
                        href={
                          interaction.customer
                            ? `/app/customers/${interaction.customer.id}`
                            : `/app/interactions?q=${encodeURIComponent(interaction.summary.slice(0, 50))}`
                        }
                        className="text-sm font-medium hover:underline"
                      >
                        {interaction.summary}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {interaction.customer?.name ?? "No customer"} ·{" "}
                        {formatDateTime(interaction.interaction_at, timezone)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
