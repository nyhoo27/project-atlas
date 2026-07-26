-- 0009: Sales records (V2).
--
-- A sale records that an item was sold to a customer: when, for how
-- much, by whom, and — via a cost snapshot taken at sale time — the
-- profit. The snapshot means later edits to an item's cost never
-- rewrite the margin of a sale that already happened.
--
-- Follows the same patterns as every other business table: workspace_id
-- on every row, soft archive (archived_at) instead of delete, a
-- configurable status via settings_options, and RLS scoped by
-- is_workspace_member.

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  item_id uuid references items(id) on delete set null,
  sold_by uuid references auth.users(id),
  status_option_id uuid references settings_options(id),
  sale_price numeric(14,2) not null check (sale_price >= 0),
  cost_price numeric(14,2) check (cost_price >= 0),
  quantity integer not null default 1 check (quantity >= 1),
  sold_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists sales_workspace_id_idx on sales (workspace_id);
create index if not exists sales_workspace_customer_idx on sales (workspace_id, customer_id);
create index if not exists sales_workspace_item_idx on sales (workspace_id, item_id);
create index if not exists sales_workspace_sold_at_idx on sales (workspace_id, sold_at);
create index if not exists sales_workspace_sold_by_idx on sales (workspace_id, sold_by);
create index if not exists sales_workspace_archived_idx on sales (workspace_id, archived_at);

create trigger set_updated_at before update on sales
  for each row execute function set_updated_at();

alter table sales enable row level security;

create policy "sales_select" on sales
  for select using (is_workspace_member(workspace_id));

create policy "sales_insert" on sales
  for insert with check (is_workspace_member(workspace_id));

create policy "sales_update" on sales
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- No delete policy: archive (archived_at) instead of deleting.

-- ---------------------------------------------------------------------------
-- Add a configurable sale_status option type to the shared seeding
-- function so new workspaces get it, then backfill existing workspaces.
-- ---------------------------------------------------------------------------

create or replace function public.seed_default_settings_options(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into settings_options (workspace_id, option_type, label, value, sort_order, is_default)
  values
    -- item_category
    (p_workspace_id, 'item_category', 'Vehicle',   'vehicle',   10, false),
    (p_workspace_id, 'item_category', 'Phone',     'phone',     20, false),
    (p_workspace_id, 'item_category', 'Property',  'property',  30, false),
    (p_workspace_id, 'item_category', 'Furniture', 'furniture', 40, false),
    (p_workspace_id, 'item_category', 'Equipment', 'equipment', 50, false),
    (p_workspace_id, 'item_category', 'Watch',     'watch',     60, false),
    (p_workspace_id, 'item_category', 'Machinery', 'machinery', 70, false),
    (p_workspace_id, 'item_category', 'Other',     'other',     80, false),

    -- item_status
    (p_workspace_id, 'item_status', 'Available',   'available',   10, true),
    (p_workspace_id, 'item_status', 'Reserved',    'reserved',    20, false),
    (p_workspace_id, 'item_status', 'Sold',        'sold',        30, false),
    (p_workspace_id, 'item_status', 'Unavailable', 'unavailable', 40, false),
    (p_workspace_id, 'item_status', 'Archived',    'archived',    50, false),

    -- customer_source
    (p_workspace_id, 'customer_source', 'Facebook',    'facebook',    10, false),
    (p_workspace_id, 'customer_source', 'TikTok',      'tiktok',      20, false),
    (p_workspace_id, 'customer_source', 'Walk-in',     'walk_in',     30, false),
    (p_workspace_id, 'customer_source', 'Referral',    'referral',    40, false),
    (p_workspace_id, 'customer_source', 'Website',     'website',     50, false),
    (p_workspace_id, 'customer_source', 'Phone Call',  'phone_call',  60, false),
    (p_workspace_id, 'customer_source', 'WhatsApp',    'whatsapp',    70, false),
    (p_workspace_id, 'customer_source', 'Other',       'other',       80, false),

    -- interaction_type
    (p_workspace_id, 'interaction_type', 'Phone Call',          'phone_call',          10, false),
    (p_workspace_id, 'interaction_type', 'WhatsApp Message',    'whatsapp_message',    20, false),
    (p_workspace_id, 'interaction_type', 'Facebook Message',    'facebook_message',    30, false),
    (p_workspace_id, 'interaction_type', 'Email',               'email',               40, false),
    (p_workspace_id, 'interaction_type', 'Walk-in',             'walk_in',             50, false),
    (p_workspace_id, 'interaction_type', 'Meeting',             'meeting',             60, false),
    (p_workspace_id, 'interaction_type', 'Demo / Inspection',   'demo_inspection',     70, false),
    (p_workspace_id, 'interaction_type', 'Negotiation',         'negotiation',         80, false),
    (p_workspace_id, 'interaction_type', 'Complaint',           'complaint',           90, false),
    (p_workspace_id, 'interaction_type', 'Follow-up',           'follow_up',          100, false),
    (p_workspace_id, 'interaction_type', 'Other',               'other',              110, false),

    -- task_status
    (p_workspace_id, 'task_status', 'To Do',       'to_do',       10, true),
    (p_workspace_id, 'task_status', 'In Progress', 'in_progress', 20, false),
    (p_workspace_id, 'task_status', 'Done',        'done',        30, false),
    (p_workspace_id, 'task_status', 'Cancelled',   'cancelled',   40, false),

    -- task_priority
    (p_workspace_id, 'task_priority', 'Low',    'low',    10, false),
    (p_workspace_id, 'task_priority', 'Medium', 'medium', 20, true),
    (p_workspace_id, 'task_priority', 'High',   'high',   30, false),
    (p_workspace_id, 'task_priority', 'Urgent', 'urgent', 40, false),

    -- sale_status (V2)
    (p_workspace_id, 'sale_status', 'Completed', 'completed', 10, true),
    (p_workspace_id, 'sale_status', 'Pending',   'pending',   20, false),
    (p_workspace_id, 'sale_status', 'Refunded',  'refunded',  30, false),
    (p_workspace_id, 'sale_status', 'Cancelled', 'cancelled', 40, false)
  on conflict (workspace_id, option_type, value) do nothing;
end;
$$;

-- Backfill sale_status (and any other missing defaults) for existing
-- workspaces. Idempotent thanks to the on-conflict clause above.
select seed_default_settings_options(id) from workspaces;
