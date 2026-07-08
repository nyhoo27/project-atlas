import { z } from "zod"

/**
 * Shared between the client forms (instant field feedback) and the server
 * actions (the validation that actually counts — never trust the client).
 */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  workspaceName: z
    .string()
    .trim()
    .min(1, "Workspace name is required")
    .max(120),
})

export type SignupValues = z.infer<typeof signupSchema>
