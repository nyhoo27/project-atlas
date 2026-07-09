"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Check, MoreHorizontal } from "lucide-react"
import { completeTask, archiveTask } from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Row actions for the task list: Mark Done (primary), plus a menu with
 * Edit, links to the linked customer/item, and Archive (owner/manager).
 */
export function TaskRowActions({
  taskId,
  title,
  isDone,
  canModify,
  canArchive,
  customerId,
  itemId,
}: {
  taskId: string
  title: string
  isDone: boolean
  canModify: boolean
  canArchive: boolean
  customerId: string | null
  itemId: string | null
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function markDone() {
    setCompleting(true)
    const result = await completeTask(taskId)
    setCompleting(false)
    if (result.ok) {
      toast.success(`"${title}" marked done.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function confirmArchive() {
    const result = await archiveTask(taskId)
    setDialogOpen(false)
    if (result.ok) {
      toast.success(`"${title}" archived.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!isDone && canModify && (
        <Button variant="outline" size="sm" onClick={markDone} disabled={completing}>
          <Check className="size-3.5" />
          {completing ? "Saving..." : "Mark Done"}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="size-8" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions for {title}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canModify && (
            <DropdownMenuItem render={<Link href={`/app/tasks/${taskId}/edit`} />}>
              Edit
            </DropdownMenuItem>
          )}
          {customerId && (
            <DropdownMenuItem render={<Link href={`/app/customers/${customerId}`} />}>
              View customer
            </DropdownMenuItem>
          )}
          {itemId && (
            <DropdownMenuItem render={<Link href={`/app/items/${itemId}`} />}>
              View item
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
        recordName={title}
        recordTypeLabel="task"
        onConfirm={confirmArchive}
      />
    </div>
  )
}
