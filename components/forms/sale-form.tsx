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
}: {
  mode: "create" | "edit"
  saleId?: string
  currency: string
  defaultValues?: Partial<SaleValues>
  customers: NamedOption[]
  items: NamedOption[]
  statuses: Option[]
  members: MemberOption[]
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
      costPrice: "",
      quantity: "1",
      notes: "",
      ...defaultValues,
      // Normalize whatever soldAt came in (raw ISO on edit) to a local
      // datetime-local value; default to now when absent.
      soldAt: defaultValues?.soldAt ? toLocalInput(defaultValues.soldAt) : localNow(),
    },
  })

  // Live totals.
  const salePrice = parseFloat(form.watch("salePrice")) || 0
  const costPrice = parseFloat(form.watch("costPrice")) || 0
  const quantity = parseInt(form.watch("quantity"), 10) || 0
  const total = salePrice * quantity
  const profit = (salePrice - costPrice) * quantity

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

  // When an item is picked in create mode, prefill sale price from its
  // selling price and cost from its cost price (both editable).
  function onItemChange(itemId: string) {
    if (mode !== "create") return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (item.sellingPrice != null && !form.getValues("salePrice")) {
      form.setValue("salePrice", String(item.sellingPrice))
    }
    if (item.costPrice != null && !form.getValues("costPrice")) {
      form.setValue("costPrice", String(item.costPrice))
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
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost price ({currency})</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="0" {...field} />
                </FormControl>
                <FormDescription>
                  Snapshot for profit. Defaults from the item.
                </FormDescription>
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

        {/* Live totals */}
        <div className="flex flex-wrap gap-6 rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(total, currency)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Profit: </span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(profit, currency)}
            </span>
          </div>
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
