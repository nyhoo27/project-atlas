"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { MoreHorizontal, Archive } from "lucide-react"
import { archiveSupplier } from "@/lib/actions/suppliers"
import { Button } from "@/components/ui/button"
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function useArchiveSupplier(supplierId: string, name: string) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  async function confirmArchive() {
    const result = await archiveSupplier(supplierId)
    setDialogOpen(false)
    if (result.ok) {
      toast.success(`${name} archived.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return { dialogOpen, setDialogOpen, confirmArchive }
}

export function SupplierRowActions({
  supplierId,
  name,
  canEdit,
  canArchive,
}: {
  supplierId: string
  name: string
  canEdit: boolean
  canArchive: boolean
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveSupplier(
    supplierId,
    name
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="size-8" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions for {name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/app/suppliers/${supplierId}`} />}>
            View
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem
              render={<Link href={`/app/suppliers/${supplierId}/edit`} />}
            >
              Edit
            </DropdownMenuItem>
          )}
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
        recordName={name}
        recordTypeLabel="supplier"
        onConfirm={confirmArchive}
      />
    </>
  )
}

export function ArchiveSupplierButton({
  supplierId,
  name,
}: {
  supplierId: string
  name: string
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveSupplier(
    supplierId,
    name
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
        recordName={name}
        recordTypeLabel="supplier"
        onConfirm={confirmArchive}
      />
    </>
  )
}
