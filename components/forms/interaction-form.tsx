"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"
import { createInteraction } from "@/lib/actions/interactions"
import {
  interactionSchema,
  type InteractionValues,
} from "@/lib/validators/interaction"
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
type NamedOption = { id: string; name: string }
type MemberOption = { userId: string; fullName: string }

/** Current local time as a datetime-local input value (YYYY-MM-DDTHH:mm). */
function nowLocal(): string {
  const now = new Date()
  now.setSeconds(0, 0)
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

/** datetime-local value -> ISO string (browser knows the user's timezone). */
function toIso(local: string): string {
  return new Date(local).toISOString()
}

/**
 * The most important form in the app — logging an interaction must be
 * fast. Saving runs ONE atomic server operation: interaction, activity
 * log, and (when a follow-up date is set) the follow-up task.
 */
export function InteractionForm({
  customers,
  items,
  types,
  members,
  currentUserId,
  defaultCustomerId,
  defaultItemId,
}: {
  customers: NamedOption[]
  items: NamedOption[]
  types: Option[]
  members: MemberOption[]
  currentUserId: string
  defaultCustomerId?: string
  defaultItemId?: string
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<InteractionValues>({
    resolver: standardSchemaResolver(interactionSchema),
    defaultValues: {
      customerId: defaultCustomerId ?? "",
      itemId: defaultItemId ?? "",
      typeOptionId: "",
      direction: "",
      interactionAt: nowLocal(),
      summary: "",
      notes: "",
      nextFollowUpAt: "",
      followUpAssignedTo: currentUserId,
    },
  })

  const hasFollowUp = Boolean(form.watch("nextFollowUpAt"))

  async function onSubmit(values: InteractionValues) {
    setServerError(null)
    const result = await createInteraction({
      ...values,
      interactionAt: toIso(values.interactionAt),
      nextFollowUpAt: values.nextFollowUpAt ? toIso(values.nextFollowUpAt) : "",
    })

    if (!result.ok) {
      setServerError(result.error)
      return
    }

    toast.success(
      result.taskCreated
        ? "Interaction logged and follow-up task created."
        : "Interaction logged."
    )
    // Back to the customer's page when there is one — that's where the
    // conversation continues.
    router.push(
      result.customerId
        ? `/app/customers/${result.customerId}`
        : "/app/interactions"
    )
    router.refresh()
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
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No customer (general)</option>
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
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
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
            name="typeOptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No type</option>
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
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
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">Not set</option>
                    <option value="inbound">Inbound — they contacted us</option>
                    <option value="outbound">Outbound — we contacted them</option>
                    <option value="internal">Internal note</option>
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interactionAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Asked about price, wants a test visit next week..."
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
                <Textarea rows={3} placeholder="Extra details (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nextFollowUpAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next follow-up</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription>
                  Setting this automatically creates a follow-up task.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="followUpAssignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign follow-up to</FormLabel>
                <FormControl>
                  <NativeSelect {...field} disabled={!hasFollowUp}>
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
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Log Interaction"}
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
