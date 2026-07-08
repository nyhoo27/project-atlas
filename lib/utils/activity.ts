import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

/**
 * Writes an activity log row. Called from server actions only — activity
 * logs are never inserted from client code. A failed log write is
 * reported but does not fail the action that triggered it (the mutation
 * itself already succeeded).
 */
export async function logActivity(
  supabase: SupabaseClient<Database>,
  entry: {
    workspaceId: string
    actorId: string
    action: string
    recordType: string
    recordId: string | null
    description: string
    metadata?: Record<string, string | number | boolean | null>
  }
): Promise<void> {
  const { error } = await supabase.from("activity_logs").insert({
    workspace_id: entry.workspaceId,
    actor_id: entry.actorId,
    action: entry.action,
    record_type: entry.recordType,
    record_id: entry.recordId,
    description: entry.description,
    metadata: entry.metadata ?? {},
  })
  if (error) {
    console.error(`Activity log failed (${entry.action}):`, error)
  }
}
