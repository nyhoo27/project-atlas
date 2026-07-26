"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { MoreHorizontal, Archive } from "lucide-react"
import { archiveSale } from "@/lib/actions/sales"
import { Button } from "@/components/ui/button"
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function useArchiveSale(saleId: string) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  async function confirmArchive() {
    const result = await archiveSale(saleId)
    setDialogOpen(false)
    if (result.ok) {
      toast.success("Sale archived.")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return { dialogOpen, setDialogOpen, confirmArchive }
}

export function SaleRowActions({
  saleId,
  label,
  canEdit,
  canArchive,
}: {
  saleId: string
  label: string
  canEdit: boolean
  canArchive: boolean
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveSale(saleId)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="size-8" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions for {label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/app/sales/${saleId}`} />}>
            View
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem render={<Link href={`/app/sales/${saleId}/edit`} />}>
              Edit
            </DropdownMenuItem>
          )}
          {canArchive && (
            <DropdownMenuItem variant="destructive" onClick={() => setDialogOpen(true)}>
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmArchiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recordName={label}
        recordTypeLabel="sale"
        onConfirm={confirmArchive}
      />
    </>
  )
}

export function ArchiveSaleButton({
  saleId,
  label,
}: {
  saleId: string
  label: string
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveSale(saleId)

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <Archive className="size-4" />
        Archive
      </Button>
      <ConfirmArchiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recordName={label}
        recordTypeLabel="sale"
        onConfirm={confirmArchive}
      />
    </>
  )
}
