/**
 * Friendly placeholder for empty lists — a short message plus an
 * optional call-to-action button.
 */
export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-10 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
