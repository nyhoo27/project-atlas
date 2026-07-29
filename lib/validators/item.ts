import { z } from "zod"

/**
 * Shared by the item form and the item server actions. Numeric fields
 * (prices, quantity) travel as strings — that's what HTML inputs
 * produce — and are validated here, then converted to numbers in the
 * server action before saving.
 */

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""))

/** "" (not provided) or a non-negative amount like 120000000 or 4500.50 */
const money = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
    "Enter a valid non-negative amount"
  )

/** A required non-negative amount (cost breakdown rows must have one). */
const requiredMoney = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid non-negative amount")

/** One line of the cost breakdown: "Shipping" + 200. */
export const costComponentSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100),
  amount: requiredMoney,
})

export type CostComponentValues = z.infer<typeof costComponentSchema>

export const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  referenceCode: optionalText(100),
  categoryOptionId: z.uuid().optional().or(z.literal("")),
  statusOptionId: z.uuid().optional().or(z.literal("")),
  supplierId: z.uuid().optional().or(z.literal("")),
  description: optionalText(5000),
  costPrice: money,
  /**
   * Optional itemized costs (manufacturing, shipping, ...). When any
   * rows exist, the server sets cost_price to their sum — the manual
   * cost field is ignored.
   */
  costBreakdown: z.array(costComponentSchema).max(20).default([]),
  sellingPrice: money,
  quantity: z
    .string()
    .trim()
    .regex(/^\d+$/, "Quantity must be a whole number")
    .refine((value) => parseInt(value, 10) >= 1, "Quantity must be at least 1"),
  location: optionalText(200),
  notes: optionalText(5000),
})

export type ItemValues = z.infer<typeof itemSchema>
