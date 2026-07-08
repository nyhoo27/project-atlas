import type { WorkspaceRole } from "@/lib/queries/current"

/**
 * Role-based permissions for V1, enforced in server actions (RLS only
 * handles workspace isolation — see docs/architecture-decisions.md #002).
 *
 * Owner       — everything, including settings and workspace info
 * Manager     — everything except workspace ownership
 * Salesperson — create/edit customers, create interactions and tasks
 * Staff       — view records, create interactions and tasks
 */

export function canManageSettings(role: WorkspaceRole): boolean {
  return role === "owner" || role === "manager"
}

export function canArchive(role: WorkspaceRole): boolean {
  return role === "owner" || role === "manager"
}

export function canCreateCustomer(role: WorkspaceRole): boolean {
  return role !== "staff"
}

/**
 * Hard delete is the exception to the archive-only rule: owners may
 * permanently remove a customer created by mistake, and only when it
 * has no logged interactions (history is never destroyed).
 */
export function canDeleteCustomer(role: WorkspaceRole): boolean {
  return role === "owner"
}

export function canEditCustomer(role: WorkspaceRole): boolean {
  return role !== "staff"
}

export function canCreateItem(role: WorkspaceRole): boolean {
  return role === "owner" || role === "manager"
}

export function canEditItem(role: WorkspaceRole): boolean {
  return role === "owner" || role === "manager"
}

/** Every role exists to log interactions — the heart of the app. */
export function canCreateInteraction(): boolean {
  return true
}

export function canCreateTask(): boolean {
  return true
}

/** Standard message returned by server actions on a failed role check. */
export const PERMISSION_ERROR =
  "You do not have permission to do this. Ask your workspace owner or manager."
