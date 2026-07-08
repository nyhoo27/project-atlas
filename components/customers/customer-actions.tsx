"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { MoreHorizontal, Archive, Trash2 } from "lucide-react"
import { archiveCustomer, deleteCustomer } from "@/lib/actions/customers"
import { Button } from "@/components/ui/button"
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

/**
 * Owner-only permanent delete for mistake records. Only rendered when
 * the customer has no interactions; the server re-checks both rules.
 */
export function DeleteCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string
  customerName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function confirmDelete() {
    setBusy(true)
    const result = await deleteCustomer(customerId)
    setBusy(false)
    setOpen(false)
    if (result.ok) {
      toast.success(`${customerName} permanently deleted.`)
      router.push("/app/customers")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete customer permanently?</DialogTitle>
            <DialogDescription>
              &ldquo;{customerName}&rdquo; will be removed forever. This cannot
              be undone. Use Archive instead if this is a real customer you
              just want out of the way.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
