import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Shown when a detail page's record does not exist in this workspace
 * (wrong id, another workspace's record, or a removed record).
 */
export default function AppNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Record not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This record may have been archived or removed, or the link may be
        wrong.
      </p>
      <Button render={<Link href="/app/dashboard" />}>Back to Dashboard</Button>
    </div>
  )
}
