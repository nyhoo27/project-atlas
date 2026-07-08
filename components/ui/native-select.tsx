import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Styled native <select>. Used for form dropdowns: works perfectly with
 * react-hook-form's register(), keyboard/mobile friendly, no popup
 * library quirks.
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pl-3 pr-8 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
