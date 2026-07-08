import { z } from "zod"

/**
 * Shared by the customer form (client feedback) and the customer server
 * actions (authoritative validation). Optional text fields accept ""
 * from empty inputs; the action converts those to null before saving.
 */

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""))

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: optionalText(50),
  email: z.email("Enter a valid email address").optional().or(z.literal("")),
  facebook: optionalText(200),
  whatsapp: optionalText(50),
  address: optionalText(500),
  notes: optionalText(5000),
  sourceOptionId: z.uuid().optional().or(z.literal("")),
  assignedTo: z.uuid().optional().or(z.literal("")),
})

export type CustomerValues = z.infer<typeof customerSchema>
