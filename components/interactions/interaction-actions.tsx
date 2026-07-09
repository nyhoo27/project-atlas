"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive } from "lucide-react"
import { archiveInteraction } from "@/lib/actions/interactions"
import { Button } from "@/components/ui/button"
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog"

/**
 * Archive is the ONLY action an interaction supports after creation
 * (append-only), and only Owner/Manager see this button.
 */
export function ArchiveInteractionButton({
  interactionId,
  summary,
}: {
  interactionId: string
  summary: string
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  async function confirmArchive() {
    const result = await archiveInteraction(interactionId)
    setDialogOpen(false)
    if (result.ok) {
      toast.success("Interaction archived.")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setDialogOpen(true)}
      >
        <Archive className="size-4" />
        <span className="sr-only">Archive interaction</span>
      </Button>
      <ConfirmArchiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recordName={summary}
        recordTypeLabel="interaction"
        onConfirm={confirmArchive}
      />
    </>
  )
}
