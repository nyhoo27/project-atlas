import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * Global search: simple case-insensitive ilike across the four main
 * record types, run in parallel, a handful of results each. Archived
 * records are excluded. (Deliberately no full-text search or trigram
 * indexes in V1 — see the spec.)
 */

export type SearchResults = {
  customers: { id: string; name: string; phone: string | null }[]
  items: { id: string; name: string; reference_code: string | null }[]
  tasks: {
    id: string
    title: string
    customer_id: string | null
    completed_at: string | null
  }[]
  interactions: {
    id: string
    summary: string
    interaction_at: string
    customer: { id: string; name: string } | null
  }[]
}

const LIMIT = 8

export async function globalSearch(
  workspaceId: string,
  rawTerm: string
): Promise<SearchResults> {
  // Strip PostgREST .or() syntax characters, then build the pattern.
  const term = rawTerm.replace(/[,()]/g, " ").trim()
  if (!term) {
    return { customers: [], items: [], tasks: [], interactions: [] }
  }
  const pattern = `%${term}%`
  const like = (fields: string[]) =>
    fields.map((field) => `${field}.ilike.${pattern}`).join(",")

  const supabase = await createClient()

  const [customers, items, tasks, interactions] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .or(like(["name", "phone", "email", "facebook", "whatsapp"]))
      .limit(LIMIT),
    supabase
      .from("items")
      .select("id, name, reference_code")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .or(like(["name", "reference_code", "description", "notes"]))
      .limit(LIMIT),
    supabase
      .from("tasks")
      .select("id, title, customer_id, completed_at")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .or(like(["title", "description"]))
      .limit(LIMIT),
    supabase
      .from("interactions")
      .select("id, summary, interaction_at, customer:customers(id, name)")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .or(like(["summary", "notes"]))
      .order("interaction_at", { ascending: false })
      .limit(LIMIT),
  ])

  return {
    customers: customers.data ?? [],
    items: items.data ?? [],
    tasks: tasks.data ?? [],
    interactions: (interactions.data ?? []) as SearchResults["interactions"],
  }
}
