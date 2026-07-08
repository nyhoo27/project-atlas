"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { MoreHorizontal, Archive } from "lucide-react"
import { archiveCustomer } from "@/lib/actions/customers"
import { Button } from "@/components/ui/button"
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Runs the archive action and reports the outcome as a toast. */
function useArchiveCustomer(customerId: string, customerName: string) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  async function confirmArchive() {
    const result = await archiveCustomer(customerId)
    setDialogOpen(false)
    if (result.ok) {
      toast.success(`${customerName} archived.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return { dialogOpen, setDialogOpen, confirmArchive }
}

/** The "..." menu on each customer list row. */
export function CustomerRowActions({
  customerId,
  customerName,
  canArchive,
}: {
  customerId: string
  customerName: string
  canArchive: boolean
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveCustomer(
    customerId,
    customerName
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="size-8" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions for {customerName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={`/app/customers/${customerId}`} />}
          >
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href={`/app/customers/${customerId}/edit`} />}
          >
            Edit
          </DropdownMenuItem>
          {canArchive && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDialogOpen(true)}
            >
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmArchiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recordName={customerName}
        recordTypeLabel="customer"
        onConfirm={confirmArchive}
      />
    </>
  )
}

/** The Archive button on the customer detail page. */
export function ArchiveCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string
  customerName: string
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveCustomer(
    customerId,
    customerName
  )

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <Archive className="size-4" />
        Archive
      </Button>
      <ConfirmArchiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recordName={customerName}
        recordTypeLabel="customer"
        onConfirm={confirmArchive}
      />
    </>
  )
}
