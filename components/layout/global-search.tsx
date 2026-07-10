"use client"

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * Topbar search box. Pressing Enter opens the grouped results page —
 * customers, items, tasks, and interactions, all matched with simple
 * case-insensitive queries.
 */
export function GlobalSearch() {
  const router = useRouter()

  return (
    <form
      className="relative w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault()
        const input = event.currentTarget.querySelector("input")
        const query = input?.value.trim()
        if (query) {
          router.push(`/app/search?q=${encodeURIComponent(query)}`)
        }
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
