import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getItems } from "@/lib/queries/items"
import { getActiveOptions } from "@/lib/queries/settings-options"
import { canArchive, canCreateItem } from "@/lib/permissions"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { ItemRowActions } from "@/components/items/item-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Items — Atlas",
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  const timezone = context.workspace.timezone ?? "Asia/Yangon"
  const currency = context.workspace.currency ?? "MMK"

  const search = typeof params.q === "string" ? params.q : ""
  const categoryFilter = typeof params.category === "string" ? params.category : ""
  const statusFilter = typeof params.status === "string" ? params.status : ""
  const showArchived = params.archived === "1"

  const [items, categories, statuses] = await Promise.all([
    getItems(context.workspace.id, {
      search,
      categoryOptionId: categoryFilter || undefined,
      statusOptionId: statusFilter || undefined,
      showArchived,
    }),
    getActiveOptions(context.workspace.id, "item_category"),
    getActiveOptions(context.workspace.id, "item_status"),
  ])

  const hasFilters = Boolean(search || categoryFilter || statusFilter || showArchived)

  return (
    <div>
      <PageHeader
        title="Items"
        description="Everything your business sells."
        actions={
          canCreateItem(context.role) && (
            <Button render={<Link href="/app/items/new" />}>
              <Plus className="size-4" />
              Add Item
            </Button>
          )
        }
      />

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search name, reference code..."
          className="w-full sm:w-64"
        />
        <NativeSelect name="category" defaultValue={categoryFilter} className="w-40">
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={statusFilter} className="w-40">
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="archived"
            value="1"
            defaultChecked={showArchived}
            className="size-4 accent-foreground"
          />
          Show archived
        </label>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" render={<Link href="/app/items" />}>
            Clear
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No items match these filters."
              : "No items yet. Add the first item your business wants to sell."
          }
          action={
            !hasFilters &&
            canCreateItem(context.role) && (
              <Button render={<Link href="/app/items/new" />}>
                <Plus className="size-4" />
                Add Item
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/app/items/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.archived_at && (
                      <Badge variant="outline" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.reference_code ?? "—"}
                  </TableCell>
                  <TableCell>
                    {item.category ? (
                      <Badge variant="secondary">{item.category.label}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {item.status ? (
                      <Badge variant="outline">{item.status.label}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(item.selling_price, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.created_at, timezone)}
                  </TableCell>
                  <TableCell>
                    <ItemRowActions
                      itemId={item.id}
                      itemName={item.name}
                      canArchive={canArchive(context.role) && !item.archived_at}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
