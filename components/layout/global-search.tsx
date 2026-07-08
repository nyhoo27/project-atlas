"use client"

import { Search } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

/**
 * Placeholder for global search — the input is real so the layout is
 * final, but searching ships in Step 11. Submitting explains that.
 */
export function GlobalSearch() {
  return (
    <form
      className="relative w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault()
        toast.info("Search is coming soon.")
      }}
    >
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search customers, items, tasks..."
        className="pl-8"
        aria-label="Global search"
      />
    </form>
  )
}
