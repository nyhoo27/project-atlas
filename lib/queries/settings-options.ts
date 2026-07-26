import "server-only"
import { createClient } from "@/lib/supabase/server"

export type SettingsOption = {
  id: string
  label: string
  value: string
  color: string | null
  is_default: boolean
}

export type OptionType =
  | "item_category"
  | "item_status"
  | "customer_source"
  | "interaction_type"
  | "task_status"
  | "task_priority"
  | "sale_status"

/**
 * Active dropdown options of one type, in display order. Deactivated
 * options are excluded — existing records that reference them still
 * show their label because detail queries join settings_options by id.
 */
export async function getActiveOptions(
  workspaceId: string,
  optionType: OptionType
): Promise<SettingsOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("settings_options")
    .select("id, label, value, color, is_default")
    .eq("workspace_id", workspaceId)
    .eq("option_type", optionType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  return data ?? []
}
