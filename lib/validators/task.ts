import { z } from "zod"

/**
 * Shared by the task form and the task server actions. dueAt travels
 * as an ISO string (the form converts datetime-local values in the
 * browser so the user's timezone is respected).
 */

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date and time")

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  assignedTo: z.uuid().optional().or(z.literal("")),
  dueAt: isoDate.optional().or(z.literal("")),
  statusOptionId: z.uuid().optional().or(z.literal("")),
  priorityOptionId: z.uuid().optional().or(z.literal("")),
  customerId: z.uuid().optional().or(z.literal("")),
  itemId: z.uuid().optional().or(z.literal("")),
})

export type TaskValues = z.infer<typeof taskSchema>
