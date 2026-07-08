"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Confirmation dialog for archive actions. Archiving hides the record
 * from normal lists but keeps it in the database (no hard deletes).
 */
export function ConfirmArchiveDialog({
  open,
  onOpenChange,
  recordName,
  recordTypeLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recordName: string
  recordTypeLabel: string
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {recordTypeLabel}?</DialogTitle>
          <DialogDescription>
            &ldquo;{recordName}&rdquo; will be hidden from lists but not
            deleted. You can still find it with the &ldquo;Show
            archived&rdquo; filter.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? "Archiving..." : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
