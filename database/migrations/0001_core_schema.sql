-- Project Atlas V1 — core schema
-- Creates all V1 tables from docs/database-design.md, in dependency order.
-- Row Level Security is enabled but policies are added later in
-- 0005_rls.sql (after the is_workspace_member() helper exists).

-- gen_random_uuid() is built into Postgres 13+, but Supabase projects
-- ship with pgcrypto enabled anyway — this is just a safe no-op if so.
create extension if not exists pgcrypto;

-- ============================================================================
-- profiles
-- App-specific profile info for authenticated users. One row per auth user,
-- created automatically by the handle_new_user trigger (see 0004).
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'App-specific profile info for authenticated users, one row per auth.users id.';

-- ============================================================================
-- workspaces
-- One row per business using Atlas.
-- ============================================================================
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  currency text not null default 'MMK',
  timezone text not null default 'Asia/Yangon',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table workspaces is 'A business using Atlas. Every business record belongs to exactly one workspace.';

-- ============================================================================
-- workspace_members
-- Links a user to a workspace with a role. A user can belong to more than
-- one workspace (future-proofing), but V1 UI only exercises one at a time.
-- ============================================================================
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'salesperson', 'staff')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

comment on table workspace_members is 'Membership + role of a user within a workspace.';

-- ============================================================================
-- settings_options
-- Configurable dropdown values (categories, statuses, sources, types, etc).
-- Never hardcode these lists in the UI — always read from this table.
-- ============================================================================
create table settings_options (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  option_type text not null,
  label text not null,
  value text not null,
  color text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, option_type, value)
);

comment on table settings_options is 'Configurable dropdown values per workspace: item_category, item_status, customer_source, interaction_type, task_status, task_priority.';

-- ============================================================================
-- customers
-- People or companies who may buy something.
-- ============================================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  facebook text,
  whatsapp text,
  address text,
  source_option_id uuid references settings_options(id),
  assigned_to uuid references auth.users(id),
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table customers is 'A person or company who may buy an item. Soft-archived, never hard-deleted.';

-- ============================================================================
-- items
-- Anything a workspace sells. Deliberately generic — not "products" or
-- "vehicles" — so any item-based business can use the same table.
-- ============================================================================
create table items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  reference_code text,
  category_option_id uuid references settings_options(id),
  status_option_id uuid references settings_options(id),
  description text,
  cost_price numeric(14, 2) check (cost_price is null or cost_price >= 0),
  selling_price numeric(14, 2) check (selling_price is null or selling_price >= 0),
  quantity integer not null default 1 check (quantity >= 1),
  location text,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table items is 'Anything a workspace sells (car, phone, property, furniture, machinery, ...). Soft-archived, never hard-deleted.';

-- ============================================================================
-- interactions
-- Every logged customer touchpoint. Append-only in V1 — no update policy
-- is created for this table (see 0005_rls.sql and Architecture Decision 003).
-- ============================================================================
create table interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  item_id uuid references items(id) on delete set null,
  interaction_type_option_id uuid references settings_options(id),
  interaction_at timestamptz not null default now(),
  direction text check (direction is null or direction in ('inbound', 'outbound', 'internal')),
  summary text not null,
  notes text,
  next_follow_up_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table interactions is 'Append-only log of every customer touchpoint. Can only be archived (Owner/Manager), never edited.';

-- ============================================================================
-- tasks
-- Follow-ups and internal work items, optionally linked to a customer,
-- item, and/or the interaction that spawned them.
-- ============================================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id),
  due_at timestamptz,
  status_option_id uuid references settings_options(id),
  priority_option_id uuid references settings_options(id),
  customer_id uuid references customers(id) on delete set null,
  item_id uuid references items(id) on delete set null,
  interaction_id uuid references interactions(id) on delete set null,
  created_by uuid references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table tasks is 'Follow-ups and internal work. May be created manually or auto-created from an interaction''s next_follow_up_at.';

-- ============================================================================
-- activity_logs
-- System-wide history. Written server-side only (server actions or
-- database functions) — never from client code.
-- ============================================================================
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  record_type text not null,
  record_id uuid,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table activity_logs is 'Human-readable history feed for the dashboard and record timelines. Server-written only.';

-- ============================================================================
-- tags
-- Flexible labels for customers and items.
-- ============================================================================
create table tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

comment on table tags is 'Free-form labels (VIP, Hot Lead, ...) that can be attached to customers and items.';

-- ============================================================================
-- record_tags
-- Links a tag to a customer or item. Kept intentionally simple in V1 —
-- only 'customer' and 'item' are valid record_type values.
-- ============================================================================
create table record_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  record_type text not null check (record_type in ('customer', 'item')),
  record_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tag_id, record_type, record_id)
);

comment on table record_tags is 'Join table linking a tag to a customer or item record.';
