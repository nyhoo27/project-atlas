-- 0011: Item images.
--
-- Photos of the things being sold. Files live in a PRIVATE Supabase
-- Storage bucket; this table records which file belongs to which item
-- and in what order. Pages hand out short-lived signed URLs, so an
-- image URL can't be passed around indefinitely and nothing is
-- readable across workspaces.
--
-- Storage path convention: {workspace_id}/{item_id}/{uuid}.{ext}
-- The leading workspace folder is what the storage policies check.

create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists item_images_item_idx on item_images (item_id, sort_order);
create index if not exists item_images_workspace_idx on item_images (workspace_id);

alter table item_images enable row level security;

create policy "item_images_select" on item_images
  for select using (is_workspace_member(workspace_id));

create policy "item_images_insert" on item_images
  for insert with check (is_workspace_member(workspace_id));

create policy "item_images_update" on item_images
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- Images are genuinely deletable (unlike business records): removing a
-- photo is housekeeping, not erasing history.
create policy "item_images_delete" on item_images
  for delete using (is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/*
 * True when the first folder of a storage path is a workspace the
 * caller belongs to. Wrapped in a function with its own exception
 * handling so a malformed path returns false instead of raising —
 * a policy that errors is a policy that can be probed.
 */
create or replace function public.storage_path_in_my_workspace(p_name text)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_workspace uuid;
begin
  begin
    v_workspace := ((storage.foldername(p_name))[1])::uuid;
  exception
    when others then
      return false;
  end;
  return is_workspace_member(v_workspace);
end;
$$;

comment on function public.storage_path_in_my_workspace(text) is
  'True if the leading folder of a storage object path is a workspace the caller is an active member of. Used by item-images storage policies.';

drop policy if exists "item_images_objects_select" on storage.objects;
drop policy if exists "item_images_objects_insert" on storage.objects;
drop policy if exists "item_images_objects_delete" on storage.objects;

create policy "item_images_objects_select" on storage.objects
  for select using (
    bucket_id = 'item-images' and storage_path_in_my_workspace(name)
  );

create policy "item_images_objects_insert" on storage.objects
  for insert with check (
    bucket_id = 'item-images' and storage_path_in_my_workspace(name)
  );

create policy "item_images_objects_delete" on storage.objects
  for delete using (
    bucket_id = 'item-images' and storage_path_in_my_workspace(name)
  );
