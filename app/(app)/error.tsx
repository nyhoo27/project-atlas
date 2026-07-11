"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

/**
 * Error boundary for authenticated pages. Unexpected server/render
 * errors land here instead of a blank screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App error boundary:", error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page could not be loaded. Please try again — if this keeps
        happening, contact your workspace owner.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
