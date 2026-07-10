"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Check, X, Trash2 } from "lucide-react"
import { createTag, renameTag, deleteTag } from "@/lib/actions/settings"
import type { Tag } from "@/lib/queries/settings-manage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** Add, rename, and delete workspace tags. */
export function TagsManager({ tags }: { tags: Tag[] }) {
  const router = useRouter()
  const [newName, setNewName] = useState("")
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deleting, setDeleting] = useState<Tag | null>(null)

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    const result = await createTag({ name: newName })
    setBusy(false)
    if (result.ok) {
      toast.success(`Tag "${newName.trim()}" added.`)
      setNewName("")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRename(tagId: string) {
    setBusy(true)
    const result = await renameTag(tagId, { name: editName })
    setBusy(false)
    if (result.ok) {
      toast.success("Tag renamed.")
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setBusy(true)
    const result = await deleteTag(deleting.id)
    setBusy(false)
    setDeleting(null)
    if (result.ok) {
      toast.success("Tag deleted.")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New tag (VIP, Hot Lead, ...)"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !newName.trim()}>
          <Plus className="size-4" />
          Add
        </Button>
      </form>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tags yet. Tags help label customers and items (VIP, Hot Lead,
          Repeat Buyer...).
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              {editingId === tag.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleRename(tag.id)
                  }}
                >
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    autoFocus
                    className="h-8"
                  />
                  <Button type="submit" size="icon-sm" disabled={busy}>
                    <Check className="size-3.5" />
                    <span className="sr-only">Save</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="size-3.5" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                </form>
              ) : (
                <>
                  <span className="truncate text-sm">{tag.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(tag.id)
                        setEditName(tag.name)
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => setDeleting(tag)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Delete {tag.name}</span>
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tag?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleting?.name}&rdquo; will be removed from every record
              that uses it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
