"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceContext } from "@/lib/queries/current"
import { logActivity } from "@/lib/utils/activity"
import { canEditItem, PERMISSION_ERROR } from "@/lib/permissions"

export type ImageActionResult =
  | { ok: true }
  | { ok: false; error: string }

const BUCKET = "item-images"
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

/**
 * Stores one photo for an item.
 *
 * The storage path always starts with the workspace id — that prefix is
 * what the storage policies check, so a file can never be read from
 * another workspace even with a direct API call.
 */
export async function uploadItemImage(
  itemId: string,
  formData: FormData
): Promise<ImageActionResult> {
  const context = await requireWorkspaceContext()
  if (!canEditItem(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG, WebP, and GIF images are supported." }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That image is larger than 5 MB. Try a smaller photo." }
  }

  const supabase = await createClient()

  // Confirm the item is in this workspace before writing anything.
  const { data: item } = await supabase
    .from("items")
    .select("id, name")
    .eq("id", itemId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle()
  if (!item) {
    return { ok: false, error: "This item may have been archived or removed." }
  }

  const path = `${context.workspace.id}/${itemId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error("uploadItemImage storage failed:", uploadError)
    return { ok: false, error: "Image could not be uploaded. Please try again." }
  }

  // Append after any existing photos.
  const { data: last } = await supabase
    .from("item_images")
    .select("sort_order")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error: rowError } = await supabase.from("item_images").insert({
    workspace_id: context.workspace.id,
    item_id: itemId,
    storage_path: path,
    sort_order: (last?.sort_order ?? 0) + 1,
    created_by: context.userId,
  })

  if (rowError) {
    // Don't leave an orphaned file behind if the row fails.
    await supabase.storage.from(BUCKET).remove([path])
    console.error("uploadItemImage row failed:", rowError)
    return { ok: false, error: "Image could not be saved. Please try again." }
  }

  await logActivity(supabase, {
    workspaceId: context.workspace.id,
    actorId: context.userId,
    action: "item.image_added",
    recordType: "item",
    recordId: itemId,
    description: `${context.profile?.full_name ?? "Someone"} added a photo to ${item.name}`,
  })

  revalidatePath(`/app/items/${itemId}`)
  revalidatePath("/app/items")
  return { ok: true }
}

export async function deleteItemImage(
  imageId: string
): Promise<ImageActionResult> {
  const context = await requireWorkspaceContext()
  if (!canEditItem(context.role)) {
    return { ok: false, error: PERMISSION_ERROR }
  }

  const supabase = await createClient()
  const { data: image } = await supabase
    .from("item_images")
    .select("id, item_id, storage_path")
    .eq("id", imageId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle()
  if (!image) {
    return { ok: false, error: "That image no longer exists." }
  }

  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path])
  if (removeError) {
    console.error("deleteItemImage storage failed:", removeError)
    return { ok: false, error: "Image could not be removed. Please try again." }
  }

  const { error: rowError } = await supabase
    .from("item_images")
    .delete()
    .eq("id", imageId)
    .eq("workspace_id", context.workspace.id)
  if (rowError) {
    console.error("deleteItemImage row failed:", rowError)
    return { ok: false, error: "Image could not be removed. Please try again." }
  }

  revalidatePath(`/app/items/${image.item_id}`)
  revalidatePath("/app/items")
  return { ok: true }
}
