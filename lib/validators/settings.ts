import { z } from "zod"

/** Validation for the Settings pages (workspace info, options, tags). */

export const workspaceInfoSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(120),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code like MMK or USD"),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value })
        return true
      } catch {
        return false
      }
    }, "Use a valid timezone like Asia/Yangon"),
})

export type WorkspaceInfoValues = z.infer<typeof workspaceInfoSchema>

export const optionLabelSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100),
})

export const OPTION_TYPES = [
  "item_category",
  "item_status",
  "customer_source",
  "interaction_type",
  "task_status",
  "task_priority",
] as const

export const tagNameSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(60),
})
