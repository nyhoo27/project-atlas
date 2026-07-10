"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Check, X } from "lucide-react"
import {
  createSettingsOption,
  renameSettingsOption,
  setSettingsOptionActive,
} from "@/lib/actions/settings"
import type { ManagedOption } from "@/lib/queries/settings-manage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

/**
 * Manages one option type (e.g. Item Categories): add, rename,
 * deactivate, reactivate. Options are never hard-deleted — records
 * created earlier keep pointing at them, so deactivation only hides
 * them from new forms.
 */
export function SettingsOptionManager({
  optionType,
  optionTypeLabel,
  options,
}: {
  optionType: string
  optionTypeLabel: string
  options: ManagedOption[]
}) {
  const router = useRouter()
  const [newLabel, setNewLabel] = useState("")
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!newLabel.trim()) return
    setBusy(true)
    const result = await createSettingsOption(optionType, { label: newLabel })
    setBusy(false)
    if (result.ok) {
      toast.success(`"${newLabel.trim()}" added.`)
      setNewLabel("")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRename(optionId: string) {
    setBusy(true)
    const result = await renameSettingsOption(optionId, { label: editLabel })
    setBusy(false)
    if (result.ok) {
      toast.success("Option renamed.")
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleSetActive(option: ManagedOption, active: boolean) {
    setBusy(true)
    const result = await setSettingsOptionActive(option.id, active)
    setBusy(false)
    if (result.ok) {
      toast.success(`"${option.label}" ${active ? "reactivated" : "deactivated"}.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          placeholder={`New ${optionTypeLabel.toLowerCase()}...`}
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !newLabel.trim()}>
          <Plus className="size-4" />
          Add
        </Button>
      </form>

      <ul className="divide-y rounded-md border">
        {options.map((option) => (
          <li
            key={option.id}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            {editingId === option.id ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleRename(option.id)
                }}
              >
                <Input
                  value={editLabel}
                  onChange={(event) => setEditLabel(event.target.value)}
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
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={
                      option.is_active
                        ? "truncate text-sm"
                        : "truncate text-sm text-muted-foreground line-through"
                    }
                  >
                    {option.label}
                  </span>
                  {option.is_default && <Badge variant="secondary">Default</Badge>}
                  {!option.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(option.id)
                      setEditLabel(option.label)
                    }}
                  >
                    Rename
                  </Button>
                  {option.is_active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => handleSetActive(option, false)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleSetActive(option, true)}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Deactivated options disappear from new forms, but records that
        already use them keep showing their label.
      </p>
    </div>
  )
}
