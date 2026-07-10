"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { toast } from "sonner"
import { updateWorkspaceInfo } from "@/lib/actions/settings"
import {
  workspaceInfoSchema,
  type WorkspaceInfoValues,
} from "@/lib/validators/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export function WorkspaceInfoForm({
  defaultValues,
}: {
  defaultValues: WorkspaceInfoValues
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<WorkspaceInfoValues>({
    resolver: standardSchemaResolver(workspaceInfoSchema),
    defaultValues,
  })

  async function onSubmit(values: WorkspaceInfoValues) {
    setServerError(null)
    const result = await updateWorkspaceInfo(values)
    if (result.ok) {
      toast.success("Workspace updated.")
      router.refresh()
    } else {
      setServerError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input placeholder="MMK" {...field} />
              </FormControl>
              <FormDescription>
                3-letter code shown next to prices (no conversion).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input placeholder="Asia/Yangon" {...field} />
              </FormControl>
              <FormDescription>
                Used for dates and &ldquo;due today&rdquo; calculations.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  )
}
