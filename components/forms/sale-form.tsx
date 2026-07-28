"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"
import { createSale, updateSale, type SaleActionResult } from "@/lib/actions/sales"
import { saleSchema, type SaleValues } from "@/lib/validators/sale"
import { formatCurrency } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/native-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type Option = { id: string; label: string }
type NamedOption = { id: string; name: string; costPrice?: number | null; sellingPrice?: number | null }
type MemberOption = { userId: string; fullName: string }

function localNow(): string {
  const now = new Date()
  now.setSeconds(0, 0)
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

/** Any parseable date (ISO from the server, or a local input value) ->
 * a datetime-local value in the browser's timezone. */
function toLocalInput(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return localNow()
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function SaleForm({
  mode,
  saleId,
  currency,
  defaultValues,
  customers,
  items,
  statuses,
  members,
  existingCostPrice,
  originalItemId,
  showFinancials = false,
}: {
  mode: "create" | "edit"
  saleId?: string
  currency: string
  defaultValues?: Partial<SaleValues>
  customers: NamedOption[]
  items: NamedOption[]
  statuses: Option[]
  members: MemberOption[]
  /** Edit mode: the cost snapshot already stored on this sale. */
  existingCostPrice?: number | null
  /** Edit mode: the item the sale was recorded against. */
  originalItemId?: string
  /**
   * Owner-only (canViewFinancials). When false the caller also strips
   * costs out of `items` and `existingCostPrice`, so no cost figure is
   * sent to the browser at all — not just hidden on screen.
   */
  showFinancials?: boolean
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<SaleValues>({
    resolver: standardSchemaResolver(saleSchema),
    defaultValues: {
      customerId: "",
      itemId: "",
      soldBy: "",
      statusOptionId: "",
      salePrice: "",
      quantity: "1",
      notes: "",
      ...defaultValues,
      // Normalize whatever soldAt came in (raw ISO on edit) to a local
      // datetime-local value; default to now when absent.
      soldAt: defaultValues?.soldAt ? toLocalInput(defaultValues.soldAt) : localNow(),
    },
  })

  // Live totals. Cost is never typed here — it comes from the item (or,
  // when editing, from the snapshot already stored on this sale).
  const salePrice = parseFloat(form.watch("salePrice")) || 0
  const quantity = parseInt(form.watch("quantity"), 10) || 0
  const selectedItemId = form.watch("itemId")
  const itemCost = items.find((i) => i.id === selectedItemId)?.costPrice ?? null
  const effectiveCost =
    mode === "edit" && selectedItemId === (originalItemId ?? "")
      ? (existingCostPrice ?? null)
      : itemCost
  const total = salePrice * quantity
  const profit = (salePrice - (effectiveCost ?? 0)) * quantity

  async function onSubmit(values: SaleValues) {
    setServerError(null)
    let result: SaleActionResult
    if (mode === "create") {
      result = await createSale(values)
    } else {
      result = await updateSale(saleId!, values)
    }
    if (result.ok) {
      toast.success(mode === "create" ? "Sale recorded." : "Sale updated.")
      router.push(`/app/sales/${result.id}`)
      router.refresh()
    } else {
      setServerError(result.error)
    }
  }

  // Picking an item in create mode prefills the sale price from its
  // selling price (still editable — you may sell above or below list).
  function onItemChange(itemId: string) {
    if (mode !== "create") return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (item.sellingPrice != null && !form.getValues("salePrice")) {
      form.setValue("salePrice", String(item.sellingPrice))
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
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item</FormLabel>
                <FormControl>
                  <NativeSelect
                    {...field}
                    onChange={(event) => {
                      field.onChange(event)
                      onItemChange(event.target.value)
                    }}
                  >
                    <option value="">No item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
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
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
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
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale price ({currency}) *</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="0" {...field} />
                </FormControl>
                <FormDescription>Price per unit.</FormDescription>
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
            name="soldAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sold on *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="soldBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sold by</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">Me</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.fullName}
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
        </div>

        {/* Live totals. Profit is owner-only and uses the item's cost
            price — set that on the item, not here. */}
        <div className="space-y-1 rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(total, currency)}
              </span>
            </div>
            {showFinancials && (
              <div>
                <span className="text-muted-foreground">Profit: </span>
                <span className="font-semibold tabular-nums">
                  {effectiveCost != null ? formatCurrency(profit, currency) : "—"}
                </span>
              </div>
            )}
          </div>
          {showFinancials && (
            <p className="text-xs text-muted-foreground">
              {effectiveCost != null
                ? `Profit uses the item's cost price of ${formatCurrency(effectiveCost, currency)} per unit.`
                : "Set a cost price on the item to see profit."}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Payment method, terms, anything worth noting" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Sale"}
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
