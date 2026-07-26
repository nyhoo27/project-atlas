import { z } from "zod"

/**
 * Shared by the sale form and the sale server actions. Money and the
 * datetime travel as strings (what inputs produce) and are converted in
 * the action.
 */

const requiredMoney = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid non-negative amount")

const optionalMoney = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
    "Enter a valid non-negative amount"
  )

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date")

export const saleSchema = z.object({
  customerId: z.uuid().optional().or(z.literal("")),
  itemId: z.uuid().optional().or(z.literal("")),
  soldBy: z.uuid().optional().or(z.literal("")),
  statusOptionId: z.uuid().optional().or(z.literal("")),
  salePrice: requiredMoney,
  costPrice: optionalMoney,
  quantity: z
    .string()
    .trim()
    .regex(/^\d+$/, "Quantity must be a whole number")
    .refine((value) => parseInt(value, 10) >= 1, "Quantity must be at least 1"),
  soldAt: isoDate,
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
})

export type SaleValues = z.infer<typeof saleSchema>
