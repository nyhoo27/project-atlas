"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { MoreHorizontal, Archive } from "lucide-react"
import { archiveItem } from "@/lib/actions/items"
import { Button } from "@/components/ui/button"
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function useArchiveItem(itemId: string, itemName: string) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  async function confirmArchive() {
    const result = await archiveItem(itemId)
    setDialogOpen(false)
    if (result.ok) {
      toast.success(`${itemName} archived.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return { dialogOpen, setDialogOpen, confirmArchive }
}

/** The "..." menu on each item list row. */
export function ItemRowActions({
  itemId,
  itemName,
  canArchive,
}: {
  itemId: string
  itemName: string
  canArchive: boolean
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveItem(
    itemId,
    itemName
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="size-8" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions for {itemName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/app/items/${itemId}`} />}>
            View
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/app/items/${itemId}/edit`} />}>
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
        recordName={itemName}
        recordTypeLabel="item"
        onConfirm={confirmArchive}
      />
    </>
  )
}

/** The Archive button on the item detail page. */
export function ArchiveItemButton({
  itemId,
  itemName,
}: {
  itemId: string
  itemName: string
}) {
  const { dialogOpen, setDialogOpen, confirmArchive } = useArchiveItem(
    itemId,
    itemName
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
        recordName={itemName}
        recordTypeLabel="item"
        onConfirm={confirmArchive}
      />
    </>
  )
}
