"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"
import { createTask, updateTask, type TaskActionResult } from "@/lib/actions/tasks"
import { taskSchema, type TaskValues } from "@/lib/validators/task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
type NamedOption = { id: string; name: string }
type MemberOption = { userId: string; fullName: string }

/** ISO string -> datetime-local input value in the browser's timezone. */
function isoToLocal(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function TaskForm({
  mode,
  taskId,
  defaultValues,
  statuses,
  priorities,
  customers,
  items,
  members,
}: {
  mode: "create" | "edit"
  taskId?: string
  defaultValues: Partial<TaskValues>
  statuses: Option[]
  priorities: Option[]
  customers: NamedOption[]
  items: NamedOption[]
  members: MemberOption[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<TaskValues>({
    resolver: standardSchemaResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      dueAt: "",
      statusOptionId: "",
      priorityOptionId: "",
      customerId: "",
      itemId: "",
      ...defaultValues,
      // dueAt arrives as ISO from the server; the input needs local time.
      ...(defaultValues.dueAt ? { dueAt: isoToLocal(defaultValues.dueAt) } : {}),
    },
  })

  async function onSubmit(values: TaskValues) {
    setServerError(null)
    const payload = {
      ...values,
      dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : "",
    }

    let result: TaskActionResult
    if (mode === "create") {
      result = await createTask(payload)
    } else {
      result = await updateTask(taskId!, payload)
    }

    if (result.ok) {
      toast.success(mode === "create" ? "Task created." : "Task updated.")
      router.push("/app/tasks")
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

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Follow up with..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="What needs to happen?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <FormField
            control={form.control}
            name="dueAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priorityOptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">No priority</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.label}
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
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked customer</FormLabel>
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
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked item</FormLabel>
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
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Task"}
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
