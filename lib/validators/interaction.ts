import { z } from "zod"

/**
 * Shared by the interaction form and the createInteraction server
 * action. Datetime fields travel as ISO strings — the form converts
 * the browser's datetime-local values to ISO (UTC) before submitting,
 * so the user's timezone is respected.
 */

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date and time")

export const interactionSchema = z.object({
  customerId: z.uuid().optional().or(z.literal("")),
  itemId: z.uuid().optional().or(z.literal("")),
  typeOptionId: z.uuid().optional().or(z.literal("")),
  direction: z.enum(["inbound", "outbound", "internal"]).optional().or(z.literal("")),
  interactionAt: isoDate,
  summary: z.string().trim().min(1, "Summary is required").max(500),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  nextFollowUpAt: isoDate.optional().or(z.literal("")),
  followUpAssignedTo: z.uuid().optional().or(z.literal("")),
})

export type InteractionValues = z.infer<typeof interactionSchema>
