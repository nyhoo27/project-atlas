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

/**
 * Adding, removing, and re-roling teammates is owner-only — it is
 * ownership-adjacent, and the spec says managers must not manage
 * workspace ownership. Managers configure options and tags, not people.
 */
export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "owner"
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

/**
 * Money the business makes — profit, margins, and aggregate revenue —
 * is owner-only. Salespeople record sales and see what the customer
 * pays, but not what the business earns on them.
 */
export function canViewFinancials(role: WorkspaceRole): boolean {
  return role === "owner"
}

/**
 * An item's cost price. Owner and manager, because managers create and
 * edit items and therefore have to set costs. Salespeople and staff
 * never see cost — otherwise hiding profit elsewhere would be pointless,
 * since cost plus the sale price gives the margin away.
 */
export function canViewItemCost(role: WorkspaceRole): boolean {
  return role === "owner" || role === "manager"
}

/**
 * Suppliers are purchasing-side information — who the business buys
 * from is commercially sensitive, so it sits with the same roles that
 * manage items and see costs.
 */
export function canViewSuppliers(role: WorkspaceRole): boolean {
  return role === "owner" || role === "manager"
}

export function canManageSuppliers(role: WorkspaceRole): boolean {
  return role === "owner" || role === "manager"
}

/**
 * Salespeople sell things, so any non-staff role can record a sale.
 * Editing a sale is limited to owner/manager or the person who recorded
 * it or made it (financial records deserve some protection); archiving
 * is owner/manager (via canArchive).
 */
export function canCreateSale(role: WorkspaceRole): boolean {
  return role !== "staff"
}

export function canModifySale(
  role: WorkspaceRole,
  userId: string,
  sale: { created_by: string | null; sold_by: string | null }
): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    sale.created_by === userId ||
    sale.sold_by === userId
  )
}

/** Every role exists to log interactions — the heart of the app. */
export function canCreateInteraction(): boolean {
  return true
}

export function canCreateTask(): boolean {
  return true
}

/**
 * Tasks are edited/completed by managers, or by the people the task
 * belongs to (its creator or assignee). Staff can complete tasks
 * assigned to them, per the V1 role rules.
 */
export function canModifyTask(
  role: WorkspaceRole,
  userId: string,
  task: { created_by: string | null; assigned_to: string | null }
): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    task.created_by === userId ||
    task.assigned_to === userId
  )
}

/** Standard message returned by server actions on a failed role check. */
export const PERMISSION_ERROR =
  "You do not have permission to do this. Ask your workspace owner or manager."
