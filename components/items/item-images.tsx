"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImagePlus, Trash2, Loader2 } from "lucide-react"
import { uploadItemImage, deleteItemImage } from "@/lib/actions/item-images"
import type { ItemImage } from "@/lib/queries/item-images"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.85

/**
 * Shrinks a photo in the browser before uploading. Phone cameras
 * produce 4–8 MB files whose full resolution is wasted on a thumbnail
 * grid; this keeps uploads fast and storage small. Falls back to the
 * original file if anything about the conversion fails.
 */
async function downscale(file: File): Promise<File> {
  if (file.type === "image/gif") return file // don't flatten animation
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1_000_000) return file

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext("2d")
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    )
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    })
  } catch {
    return file
  }
}

export function ItemImages({
  itemId,
  images,
  canEdit,
}: {
  itemId: string
  images: ItemImage[]
  canEdit: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<ItemImage | null>(null)
  const [busy, setBusy] = useState(false)

  async function onFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    // Let the same file be picked again after this run.
    event.target.value = ""
    if (files.length === 0) return

    setUploading(true)
    let added = 0
    for (const file of files) {
      const prepared = await downscale(file)
      const formData = new FormData()
      formData.append("file", prepared)
      const result = await uploadItemImage(itemId, formData)
      if (result.ok) {
        added += 1
      } else {
        toast.error(result.error)
        break
      }
    }
    setUploading(false)
    if (added > 0) {
      toast.success(added === 1 ? "Photo added." : `${added} photos added.`)
      router.refresh()
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    const result = await deleteItemImage(deleting.id)
    setBusy(false)
    setDeleting(null)
    if (result.ok) {
      toast.success("Photo removed.")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={onFilesChosen}
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {uploading ? "Uploading..." : "Add Photos"}
          </Button>
          <p className="text-sm text-muted-foreground">
            JPG, PNG, WebP or GIF. Large photos are shrunk automatically.
          </p>
        </div>
      )}

      {images.length === 0 ? (
        <EmptyState
          message={
            canEdit
              ? "No photos yet. Add pictures so your team can recognise this item at a glance."
              : "No photos for this item yet."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="group relative">
              {/* Signed URLs from private storage — plain <img> rather
                  than next/image, which would need the host allow-listed
                  and can't cache an expiring URL usefully. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-md border object-cover"
              />
              {canEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => setDeleting(image)}
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Remove photo</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove photo?</DialogTitle>
            <DialogDescription>
              The image file will be deleted permanently. The item itself is
              not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
