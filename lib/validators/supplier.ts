import { z } from "zod"

/** Shared by the supplier form and the supplier server actions. */

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""))

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contactPerson: optionalText(200),
  phone: optionalText(50),
  email: z.email("Enter a valid email address").optional().or(z.literal("")),
  address: optionalText(500),
  notes: optionalText(5000),
})

export type SupplierValues = z.infer<typeof supplierSchema>
