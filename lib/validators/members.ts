import { z } from "zod"

/** Roles a member can hold, and the labels shown in the UI. */
export const MEMBER_ROLES = ["owner", "manager", "salesperson", "staff"] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  manager: "Manager",
  salesperson: "Salesperson",
  staff: "Staff",
}

const roleSchema = z.enum(MEMBER_ROLES)

/**
 * Adding a teammate. The owner sets an initial password and shares it
 * with the person (there is no email-invite flow in V1); the member
 * logs in and — once a change-password screen exists — can change it.
 */
export const addMemberSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.email("Enter a valid email address"),
  role: roleSchema,
  password: z.string().min(8, "Initial password must be at least 8 characters"),
})

export type AddMemberValues = z.infer<typeof addMemberSchema>

export const updateRoleSchema = z.object({
  role: roleSchema,
})
