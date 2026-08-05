import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getSuppliers } from "@/lib/queries/suppliers"
import { canArchive, canManageSuppliers, canViewSuppliers } from "@/lib/permissions"
import { formatDate } from "@/lib/utils/format"
import { getPage } from "@/lib/utils/pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SupplierRowActions } from "@/components/suppliers/supplier-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Suppliers — Atlas",
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireWorkspaceContext()
  // Purchasing information is owner/manager only.
  if (!canViewSuppliers(context.role)) {
    redirect("/app/dashboard")
  }
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const search = typeof params.q === "string" ? params.q : ""
  const showArchived = params.archived === "1"

  const page = getPage(params.page)
  const { rows: suppliers, total } = await getSuppliers(context.workspace.id, {
    search,
    showArchived,
    page,
  })
  const hasFilters = Boolean(search || showArchived)

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Who your business buys from."
        actions={
          canManageSuppliers(context.role) && (
            <Button render={<Link href="/app/suppliers/new" />}>
              <Plus className="size-4" />
              Add Supplier
            </Button>
          )
        }
      />

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search name, contact, phone, email..."
          className="w-full sm:w-72"
        />
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
          <Button variant="ghost" size="sm" render={<Link href="/app/suppliers" />}>
            Clear
          </Button>
        )}
      </form>

      {suppliers.length === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No suppliers match these filters."
              : "No suppliers yet. Add the businesses you buy your items from."
          }
          action={
            !hasFilters &&
            canManageSuppliers(context.role) && (
              <Button render={<Link href="/app/suppliers/new" />}>
                <Plus className="size-4" />
                Add Supplier
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
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link
                      href={`/app/suppliers/${supplier.id}`}
                      className="font-medium hover:underline"
                    >
                      {supplier.name}
                    </Link>
                    {supplier.archived_at && (
                      <Badge variant="outline" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{supplier.contact_person ?? "—"}</TableCell>
                  <TableCell>
                    {supplier.phone ? (
                      <a href={`tel:${supplier.phone}`} className="hover:underline">
                        {supplier.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.email ? (
                      <a href={`mailto:${supplier.email}`} className="hover:underline">
                        {supplier.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(supplier.created_at, timezone)}
                  </TableCell>
                  <TableCell>
                    <SupplierRowActions
                      supplierId={supplier.id}
                      name={supplier.name}
                      canEdit={canManageSuppliers(context.role)}
                      canArchive={canArchive(context.role) && !supplier.archived_at}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationControls
        page={page}
        total={total}
        basePath="/app/suppliers"
        searchParams={params}
        label="suppliers"
      />
    </div>
  )
}
