import "server-only"
import { createClient } from "@/lib/supabase/server"

const BUCKET = "item-images"
/** Long enough to browse a page comfortably, short enough that a copied URL goes stale. */
const SIGNED_URL_TTL_SECONDS = 60 * 60

export type ItemImage = {
  id: string
  url: string
}

/**
 * Photos for one item, oldest first, as short-lived signed URLs. The
 * bucket is private, so these URLs are the only way to view a file and
 * they expire on their own.
 */
export async function getItemImages(
  workspaceId: string,
  itemId: string
): Promise<ItemImage[]> {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from("item_images")
    .select("id, storage_path")
    .eq("workspace_id", workspaceId)
    .eq("item_id", itemId)
    .order("sort_order", { ascending: true })
  if (!rows || rows.length === 0) return []

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS
    )

  const urlByPath = new Map(
    (signed ?? []).map((entry) => [entry.path, entry.signedUrl])
  )

  return rows
    .map((row) => ({ id: row.id, url: urlByPath.get(row.storage_path) ?? "" }))
    .filter((image) => image.url !== "")
}

/**
 * First photo of each of the given items, for list thumbnails. One
 * query plus one batch of signed URLs, rather than per-row lookups.
 */
export async function getItemThumbnails(
  workspaceId: string,
  itemIds: string[]
): Promise<Map<string, string>> {
  if (itemIds.length === 0) return new Map()
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from("item_images")
    .select("item_id, storage_path, sort_order")
    .eq("workspace_id", workspaceId)
    .in("item_id", itemIds)
    .order("sort_order", { ascending: true })
  if (!rows || rows.length === 0) return new Map()

  // Keep only the first image per item.
  const firstByItem = new Map<string, string>()
  for (const row of rows) {
    if (!firstByItem.has(row.item_id)) {
      firstByItem.set(row.item_id, row.storage_path)
    }
  }

  const paths = [...firstByItem.values()]
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  const urlByPath = new Map(
    (signed ?? []).map((entry) => [entry.path, entry.signedUrl])
  )

  const result = new Map<string, string>()
  for (const [itemId, path] of firstByItem) {
    const url = urlByPath.get(path)
    if (url) result.set(itemId, url)
  }
  return result
}
