"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { createItem, updateItem, type ItemActionResult } from "@/lib/actions/items"
import { itemSchema, type ItemValues } from "@/lib/validators/item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/native-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type Option = { id: string; label: string }

/** Round to 2 decimals and render without trailing zeros ("1200", "1200.5"). */
function trimNumber(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : ""
}

export function ItemForm({
  mode,
  itemId,
  currency,
  defaultValues,
  categories,
  statuses,
  suppliers,
}: {
  mode: "create" | "edit"
  itemId?: string
  currency: string
  defaultValues?: Partial<ItemValues>
  categories: Option[]
  statuses: Option[]
  suppliers: Option[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  // Profit margin is a calculator, not a stored field: entering a margin
  // fills in the selling price (cost 1000 + 20% -> 1200), and typing a
  // selling price shows the resulting margin. On edit, start from the
  // saved prices.
  const [margin, setMargin] = useState<string>(() => {
    const cost = parseFloat(defaultValues?.costPrice ?? "")
    const selling = parseFloat(defaultValues?.sellingPrice ?? "")
    if (cost > 0 && selling >= 0) return trimNumber(((selling - cost) / cost) * 100)
    return ""
  })

  const form = useForm<ItemValues>({
    resolver: standardSchemaResolver(itemSchema),
    defaultValues: {
      name: "",
      referenceCode: "",
      categoryOptionId: "",
      statusOptionId: "",
      supplierId: "",
      description: "",
      costPrice: "",
      costBreakdown: [],
      sellingPrice: "",
      quantity: "1",
      location: "",
      notes: "",
      ...defaultValues,
    },
  })

  const breakdown = useFieldArray({
    control: form.control,
    name: "costBreakdown",
  })

  /**
   * When breakdown rows exist, the cost price is their sum — recompute
   * it and let the margin/selling logic follow, exactly as if the user
   * had typed the total into the cost field.
   */
  function syncCostFromBreakdown() {
    const rows = form.getValues("costBreakdown")
    if (rows.length === 0) return
    const total = rows.reduce((sum, row) => {
      const amount = parseFloat(row.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)
    const totalText = trimNumber(total)
    form.setValue("costPrice", totalText, { shouldValidate: true })
    if (margin !== "") {
      recalcSellingPrice(totalText, margin)
    } else {
      recalcMargin(totalText, form.getValues("sellingPrice"))
    }
  }

  /** cost + margin% -> selling price */
  function recalcSellingPrice(costValue: string, marginValue: string) {
    const cost = parseFloat(costValue)
    const pct = parseFloat(marginValue)
    if (cost >= 0 && Number.isFinite(cost) && Number.isFinite(pct)) {
      form.setValue("sellingPrice", trimNumber(cost * (1 + pct / 100)), {
        shouldValidate: true,
      })
    }
  }

  /** cost + selling price -> margin% */
  function recalcMargin(costValue: string, sellingValue: string) {
    const cost = parseFloat(costValue)
    const selling = parseFloat(sellingValue)
    if (cost > 0 && Number.isFinite(selling)) {
      setMargin(trimNumber(((selling - cost) / cost) * 100))
    } else {
      setMargin("")
    }
  }

  async function onSubmit(values: ItemValues) {
    setServerError(null)
    let result: ItemActionResult
    if (mode === "create") {
      result = await createItem(values)
    } else {
      result = await updateItem(itemId!, values)
    }

    if (result.ok) {
      toast.success(mode === "create" ? "Item created." : "Item updated.")
      router.push(`/app/items/${result.id}`)
      router.refresh()
    } else {
      setServerError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Toyota Crown 2018" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referenceCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference code</FormLabel>
                <FormControl>
                  <Input placeholder="ITEM-001, SKU, stock ID..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoryOptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statusOptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No status</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.label}
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost price ({currency})</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    {...field}
                    disabled={breakdown.fields.length > 0}
                    onChange={(event) => {
                      field.onChange(event)
                      // A set margin drives the selling price; otherwise
                      // re-derive the margin from the selling price.
                      if (margin !== "") {
                        recalcSellingPrice(event.target.value, margin)
                      } else {
                        recalcMargin(
                          event.target.value,
                          form.getValues("sellingPrice")
                        )
                      }
                    }}
                  />
                </FormControl>
                {breakdown.fields.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Calculated from the cost breakdown below.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Not a form field — a calculator that isn't saved. Plain
              markup because Form* components need a FormField context. */}
          <div className="grid gap-2">
            <Label htmlFor="profit-margin">Profit margin (%)</Label>
            <Input
              id="profit-margin"
              inputMode="decimal"
              placeholder="20"
              value={margin}
              onChange={(event) => {
                setMargin(event.target.value)
                recalcSellingPrice(
                  form.getValues("costPrice"),
                  event.target.value
                )
              }}
            />
            <p className="text-sm text-muted-foreground">
              Calculator only — fills in the selling price from the cost.
            </p>
          </div>
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling price ({currency})</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    {...field}
                    onChange={(event) => {
                      field.onChange(event)
                      recalcMargin(
                        form.getValues("costPrice"),
                        event.target.value
                      )
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity *</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Showroom, warehouse, branch..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Itemized costs: each row is a label + amount; the sum becomes
            the cost price above. */}
        <div className="space-y-3 rounded-md border p-4">
          <div>
            <p className="text-sm font-medium">Cost breakdown</p>
            <p className="text-sm text-muted-foreground">
              Optional. Split the cost into parts (manufacturing, shipping,
              customs...) — they add up to the cost price automatically.
            </p>
          </div>
          {breakdown.fields.map((row, index) => (
            <div key={row.id} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name={`costBreakdown.${index}.label`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Shipping, manufacturing..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`costBreakdown.${index}.amount`}
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event)
                          syncCostFromBreakdown()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 text-destructive"
                onClick={() => {
                  breakdown.remove(index)
                  // remove() updates the array synchronously; re-sum what's
                  // left (or restore manual entry when the last row goes).
                  if (form.getValues("costBreakdown").length > 0) {
                    syncCostFromBreakdown()
                  }
                }}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Remove cost row</span>
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => breakdown.append({ label: "", amount: "" })}
          >
            <Plus className="size-3.5" />
            Add cost
          </Button>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="What is this item? Key details a buyer would ask about."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Internal notes (not shown to customers)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Item"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
