import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { getSupplierById, getItemsBySupplier } from "@/lib/queries/suppliers"
import {
  canArchive,
  canCreateItem,
  canManageSuppliers,
  canViewSuppliers,
} from "@/lib/permissions"
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils/format"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArchiveSupplierButton } from "@/components/suppliers/supplier-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Supplier — Atlas",
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireWorkspaceContext()
  if (!canViewSuppliers(context.role)) {
    redirect("/app/dashboard")
  }
  const timezone = context.workspace.timezone ?? "Asia/Yangon"

  const supplier = await getSupplierById(context.workspace.id, id)
  if (!supplier) notFound()

  const items = await getItemsBySupplier(context.workspace.id, id)

  return (
    <div>
      <PageHeader
        title={supplier.name}
        description={supplier.contact_person ?? undefined}
        actions={
          <>
            {canCreateItem(context.role) && (
              <Button render={<Link href={`/app/items/new?supplier=${supplier.id}`} />}>
                <Plus className="size-4" />
                Add Item
              </Button>
            )}
            {canManageSuppliers(context.role) && (
              <Button
                variant="outline"
                render={<Link href={`/app/suppliers/${supplier.id}/edit`} />}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {canArchive(context.role) && !supplier.archived_at && (
              <ArchiveSupplierButton supplierId={supplier.id} name={supplier.name} />
            )}
          </>
        }
      />

      {supplier.archived_at && (
        <Badge variant="outline" className="mb-4">
          Archived {formatDate(supplier.archived_at, timezone)}
        </Badge>
      )}

      <div className="space-y-6">
        <Card>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
            <Field label="Contact person">{supplier.contact_person ?? "—"}</Field>
            <Field label="Phone">
              {supplier.phone ? (
                <a href={`tel:${supplier.phone}`} className="hover:underline">
                  {supplier.phone}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Email">
              {supplier.email ? (
                <a href={`mailto:${supplier.email}`} className="hover:underline">
                  {supplier.email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Address">{supplier.address ?? "—"}</Field>
            <Field label="Added">
              {formatDateTime(supplier.created_at, timezone)}
            </Field>
            <Field label="Last updated">
              {formatRelative(supplier.updated_at, timezone)}
            </Field>
            {supplier.notes && (
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <span className="whitespace-pre-wrap">{supplier.notes}</span>
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Items from this supplier ({items.length})
          </h2>
          {items.length === 0 ? (
            <EmptyState message="No items are linked to this supplier yet. Choose this supplier when adding or editing an item." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.reference_code ?? "—"}
                      </TableCell>
                      <TableCell>
                        {item.status ? (
                          <Badge variant="outline">{item.status.label}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  )
}
