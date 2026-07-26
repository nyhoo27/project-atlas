import Link from "next/link"
import type { SaleListRow } from "@/lib/queries/sales"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { SaleRowActions } from "@/components/sales/sale-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Shared sales table. `context` controls which columns show — the item
 * column is dropped on an item's own page, the customer column on a
 * customer's page.
 */
export function SalesTable({
  sales,
  currency,
  timezone,
  memberName,
  showCustomer = true,
  showItem = true,
  canEdit,
  canArchive,
}: {
  sales: SaleListRow[]
  currency: string
  timezone: string
  memberName: Map<string, string>
  showCustomer?: boolean
  showItem?: boolean
  canEdit: (sale: SaleListRow) => boolean
  canArchive: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {showItem && <TableHead>Item</TableHead>}
            {showCustomer && <TableHead>Customer</TableHead>}
            <TableHead>Sold By</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => {
            const total = Number(sale.sale_price) * sale.quantity
            const profit =
              (Number(sale.sale_price) - (sale.cost_price != null ? Number(sale.cost_price) : 0)) *
              sale.quantity
            return (
              <TableRow key={sale.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  <Link href={`/app/sales/${sale.id}`} className="hover:underline">
                    {formatDate(sale.sold_at, timezone)}
                  </Link>
                  {sale.archived_at && (
                    <Badge variant="outline" className="ml-2">
                      Archived
                    </Badge>
                  )}
                </TableCell>
                {showItem && (
                  <TableCell>
                    {sale.item ? (
                      <Link href={`/app/items/${sale.item.id}`} className="hover:underline">
                        {sale.item.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                {showCustomer && (
                  <TableCell>
                    {sale.customer ? (
                      <Link
                        href={`/app/customers/${sale.customer.id}`}
                        className="hover:underline"
                      >
                        {sale.customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">
                  {sale.sold_by ? (memberName.get(sale.sold_by) ?? "Unknown") : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{sale.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(total, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {sale.cost_price != null ? formatCurrency(profit, currency) : "—"}
                </TableCell>
                <TableCell>
                  {sale.status ? <Badge variant="secondary">{sale.status.label}</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <SaleRowActions
                    saleId={sale.id}
                    label={`sale on ${formatDate(sale.sold_at, timezone)}`}
                    canEdit={canEdit(sale)}
                    canArchive={canArchive && !sale.archived_at}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
