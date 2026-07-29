-- 0010: Suppliers.
--
-- Who the business buys from. Deliberately shaped like customers (the
-- other "people we deal with" table): contact details, notes, soft
-- archive, workspace-scoped. Items point at the supplier they were
-- bought from.
--
-- One supplier per item: a trading business buys a given item from one
-- source. If multi-sourcing is needed later, this becomes a join table
-- without changing what exists.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists suppliers_workspace_id_idx on suppliers (workspace_id);
create index if not exists suppliers_workspace_name_idx on suppliers (workspace_id, name);
create index if not exists suppliers_workspace_archived_idx on suppliers (workspace_id, archived_at);

create trigger set_updated_at before update on suppliers
  for each row execute function set_updated_at();

alter table suppliers enable row level security;

create policy "suppliers_select" on suppliers
  for select using (is_workspace_member(workspace_id));

create policy "suppliers_insert" on suppliers
  for insert with check (is_workspace_member(workspace_id));

create policy "suppliers_update" on suppliers
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- No delete policy: archive (archived_at) instead of deleting.

-- Link items to the supplier they came from. on delete set null so
-- archiving/removing a supplier never destroys item records.
alter table public.items
  add column if not exists supplier_id uuid references suppliers(id) on delete set null;

create index if not exists items_workspace_supplier_idx on items (workspace_id, supplier_id);
