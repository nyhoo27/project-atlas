import "server-only"
import { createClient } from "@/lib/supabase/server"
import { todayRange } from "@/lib/utils/format"

export type SaleListRow = {
  id: string
  sale_price: number
  cost_price: number | null
  quantity: number
  sold_at: string
  sold_by: string | null
  archived_at: string | null
  customer: { id: string; name: string } | null
  item: { id: string; name: string } | null
  status: { label: string } | null
}

export type SaleListFilters = {
  customerId?: string
  itemId?: string
  soldBy?: string
  statusOptionId?: string
  showArchived?: boolean
}

const LIST_SELECT = `id, sale_price, cost_price, quantity, sold_at, sold_by, archived_at,
   customer:customers(id, name),
   item:items(id, name),
   status:settings_options(label)`

export async function getSales(
  workspaceId: string,
  filters: SaleListFilters
): Promise<SaleListRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("sales")
    .select(LIST_SELECT)
    .eq("workspace_id", workspaceId)
    .order("sold_at", { ascending: false })
    .limit(300)

  if (!filters.showArchived) query = query.is("archived_at", null)
  if (filters.customerId) query = query.eq("customer_id", filters.customerId)
  if (filters.itemId) query = query.eq("item_id", filters.itemId)
  if (filters.soldBy) query = query.eq("sold_by", filters.soldBy)
  if (filters.statusOptionId) query = query.eq("status_option_id", filters.statusOptionId)

  const { data } = await query
  return (data ?? []) as SaleListRow[]
}

/** Sales linked to one customer (for the customer detail Sales tab). */
export async function getSalesByCustomer(
  workspaceId: string,
  customerId: string
): Promise<SaleListRow[]> {
  return getSales(workspaceId, { customerId })
}

/** Sales of one item (for the item detail Sales tab). */
export async function getSalesByItem(
  workspaceId: string,
  itemId: string
): Promise<SaleListRow[]> {
  return getSales(workspaceId, { itemId })
}

export type SaleDetail = {
  id: string
  sale_price: number
  cost_price: number | null
  quantity: number
  sold_at: string
  sold_by: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  customer_id: string | null
  item_id: string | null
  status_option_id: string | null
  customer: { id: string; name: string } | null
  item: { id: string; name: string } | null
  status: { label: string } | null
}

export async function getSaleById(
  workspaceId: string,
  saleId: string
): Promise<SaleDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("sales")
    .select(
      `id, sale_price, cost_price, quantity, sold_at, sold_by, notes,
       created_by, created_at, updated_at, archived_at,
       customer_id, item_id, status_option_id,
       customer:customers(id, name),
       item:items(id, name),
       status:settings_options(label)`
    )
    .eq("workspace_id", workspaceId)
    .eq("id", saleId)
    .maybeSingle()
  return data as SaleDetail | null
}

/**
 * Active items with their prices, for the sale form's auto-fill (picking
 * an item prefills sale price from its selling price and cost from its
 * cost price).
 */
export async function getItemOptionsWithPrices(
  workspaceId: string
): Promise<{ id: string; name: string; costPrice: number | null; sellingPrice: number | null }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("items")
    .select("id, name, cost_price, selling_price")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500)
  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    costPrice: item.cost_price != null ? Number(item.cost_price) : null,
    sellingPrice: item.selling_price != null ? Number(item.selling_price) : null,
  }))
}

export type SalesSummary = {
  monthCount: number
  monthRevenue: number
  monthProfit: number
}

/**
 * This-month totals (workspace timezone) for the dashboard: number of
 * sales, revenue (sale_price x qty), and profit (using each sale's cost
 * snapshot). Fetches the month's non-archived sales and sums in code —
 * fine for V1/V2 workspace sizes.
 */
export async function getSalesSummary(
  workspaceId: string,
  timezone: string
): Promise<SalesSummary> {
  const supabase = await createClient()
  const { start } = todayRange(timezone)
  // Start of the current month, in the workspace timezone, as a UTC instant.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start)
  const monthStart = new Date(`${ymd.slice(0, 7)}-01T00:00:00Z`)

  const { data } = await supabase
    .from("sales")
    .select("sale_price, cost_price, quantity, sold_at")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .gte("sold_at", monthStart.toISOString())
    .limit(1000)

  const rows = data ?? []
  let revenue = 0
  let profit = 0
  for (const row of rows) {
    const qty = row.quantity ?? 1
    const price = Number(row.sale_price) || 0
    const cost = row.cost_price != null ? Number(row.cost_price) : 0
    revenue += price * qty
    profit += (price - cost) * qty
  }

  return {
    monthCount: rows.length,
    monthRevenue: Math.round(revenue * 100) / 100,
    monthProfit: Math.round(profit * 100) / 100,
  }
}
