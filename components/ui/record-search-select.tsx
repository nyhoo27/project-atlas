"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X, Loader2 } from "lucide-react"
import {
  searchCustomers,
  searchItems,
  type RecordOption,
} from "@/lib/actions/record-search"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const SEARCHERS = {
  customer: searchCustomers,
  item: searchItems,
} as const

/**
 * Type-to-search picker for a single record. Results come from the
 * server as you type, so it works the same with ten records or ten
 * thousand — unlike a <select>, which would need every option up front.
 *
 * Deliberately plain markup (input + list) rather than a popup library:
 * it keeps focus and keyboard behaviour predictable inside forms.
 */
export function RecordSearchSelect({
  kind,
  value,
  initialLabel,
  onChange,
  placeholder,
  emptyLabel = "No matches found.",
  disabled = false,
}: {
  kind: keyof typeof SEARCHERS
  /** Selected record id, or "" for none. */
  value: string
  /** Name of the already-selected record (edit mode). */
  initialLabel?: string
  onChange: (id: string, option?: RecordOption) => void
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
}) {
  const [text, setText] = useState(initialLabel ?? "")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<RecordOption[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Guards against an earlier, slower request overwriting a later one.
  const requestId = useRef(0)

  // Debounced lookup whenever the box is open and the text changes.
  useEffect(() => {
    if (!open) return
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const found = await SEARCHERS[kind](text)
        if (id === requestId.current) {
          setResults(found)
          setActiveIndex(0)
        }
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [text, open, kind])

  // Close when focus or a click leaves the component.
  useEffect(() => {
    function onDocumentPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onDocumentPointerDown)
    return () => document.removeEventListener("pointerdown", onDocumentPointerDown)
  }, [])

  function select(option: RecordOption) {
    setText(option.name)
    setOpen(false)
    onChange(option.id, option)
  }

  function clear() {
    setText("")
    setResults([])
    onChange("")
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (!open) setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      // Don't submit the form while choosing from the list.
      if (open && results[activeIndex]) {
        event.preventDefault()
        select(results[activeIndex])
      }
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="pl-8 pr-8"
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
          // Typing invalidates any previous choice.
          if (value) onChange("")
        }}
      />
      {(text || value) && !disabled && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          <span className="sr-only">Clear selection</span>
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {loading && results.length === 0 ? (
            <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching...
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <ul>
              {results.map((option, index) => (
                <li key={option.id}>
                  <button
                    type="button"
                    // Keep focus in the input so blur doesn't close the
                    // list before the click lands.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm",
                      index === activeIndex && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="font-medium">{option.name}</span>
                    {option.hint && (
                      <span className="text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
