import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { OptionType } from "@/lib/queries/settings-options"

export type ManagedOption = {
  id: string
  option_type: string
  label: string
  value: string
  color: string | null
  sort_order: number
  is_default: boolean
  is_active: boolean
}

/**
 * ALL options of a type — including deactivated ones — for the
 * Settings manager UI. (Forms use getActiveOptions instead.)
 */
export async function getAllOptions(
  workspaceId: string,
  optionType: OptionType
): Promise<ManagedOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("settings_options")
    .select("id, option_type, label, value, color, sort_order, is_default, is_active")
    .eq("workspace_id", workspaceId)
    .eq("option_type", optionType)
    .order("sort_order", { ascending: true })
  return data ?? []
}

export type Tag = {
  id: string
  name: string
  color: string | null
}

export async function getTags(workspaceId: string): Promise<Tag[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })
  return data ?? []
}
