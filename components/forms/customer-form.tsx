"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import {
  createCustomer,
  updateCustomer,
  type CustomerActionResult,
} from "@/lib/actions/customers"
import { customerSchema, type CustomerValues } from "@/lib/validators/customer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/native-select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type Option = { id: string; label: string }
type MemberOption = { userId: string; fullName: string }

/**
 * Create/edit customer form. On a duplicate phone number the server
 * returns a warning instead of saving; the form shows it and lets the
 * user save anyway (two customers may legitimately share a number).
 */
export function CustomerForm({
  mode,
  customerId,
  defaultValues,
  sources,
  members,
}: {
  mode: "create" | "edit"
  customerId?: string
  defaultValues?: Partial<CustomerValues>
  sources: Option[]
  members: MemberOption[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const form = useForm<CustomerValues>({
    resolver: standardSchemaResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      facebook: "",
      whatsapp: "",
      address: "",
      notes: "",
      sourceOptionId: "",
      assignedTo: "",
      ...defaultValues,
    },
  })

  async function onSubmit(values: CustomerValues) {
    setServerError(null)
    // A pending duplicate warning means the user clicked "Save anyway".
    const options = { confirmDuplicate: duplicateWarning !== null }

    let result: CustomerActionResult
    if (mode === "create") {
      result = await createCustomer(values, options)
    } else {
      result = await updateCustomer(customerId!, values, options)
    }

    if (result.ok) {
      toast.success(
        mode === "create" ? "Customer created." : "Customer updated."
      )
      router.push(`/app/customers/${result.id}`)
      router.refresh()
      return
    }

    if ("duplicate" in result) {
      setDuplicateWarning(result.error)
      return
    }

    setServerError(result.error)
    setDuplicateWarning(null)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-2xl space-y-4"
      >
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        {duplicateWarning && (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertTitle>Possible duplicate</AlertTitle>
            <AlertDescription>
              {duplicateWarning} Click &ldquo;Save anyway&rdquo; if this is a
              different customer.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Ko Aung" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="09123456789"
                    {...field}
                    onChange={(event) => {
                      field.onChange(event)
                      // Phone changed — any previous duplicate warning is stale.
                      setDuplicateWarning(null)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="customer@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook</FormLabel>
                <FormControl>
                  <Input placeholder="Profile name or link" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp</FormLabel>
                <FormControl>
                  <Input placeholder="09123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Street, township, city" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="sourceOptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No source</option>
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.label}
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
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned to</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">Unassigned</option>
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Anything worth remembering about this customer"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Saving..."
              : duplicateWarning
                ? "Save anyway"
                : "Save Customer"}
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
