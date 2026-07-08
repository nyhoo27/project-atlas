-- Project Atlas V1 — Row Level Security
--
-- Scope: workspace isolation only. Role-based rules (e.g. "only Owner or
-- Manager can archive") are enforced in server actions via lib/permissions,
-- NOT here — see Architecture Decision 002 in docs/architecture-decisions.md.
--
-- IMPORTANT: is_workspace_member() is SECURITY DEFINER so it can read
-- workspace_members while bypassing RLS internally. Policies on
-- workspace_members must call this function rather than querying
-- workspace_members directly in their USING clause — a policy that selects
-- from its own table causes infinite recursion in Postgres/Supabase. This
-- is exactly what the helper function avoids.

-- ============================================================================
-- Helper functions
-- ============================================================================

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

comment on function public.is_workspace_member(uuid) is 'True if the current auth.uid() is an active member of the given workspace. SECURITY DEFINER to avoid RLS recursion on workspace_members.';

create or replace function public.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from workspace_members wm1
    join workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
    where wm1.user_id = auth.uid()
      and wm1.status = 'active'
      and wm2.user_id = p_user_id
      and wm2.status = 'active'
  );
$$;

comment on function public.shares_workspace_with(uuid) is 'True if the current auth.uid() shares an active workspace membership with the given user. Lets teammates see each other''s profile (name/avatar) for "assigned to" and activity log display.';

-- ============================================================================
-- Interactions are append-only (Architecture Decision 003): a database
-- trigger, not just RLS, blocks changes to any column except archived_at.
-- This is a safety net that holds even if a bug ever let an update through
-- server-action checks.
-- ============================================================================

create or replace function public.enforce_interaction_append_only()
returns trigger
language plpgsql
as $$
begin
  if (
    new.workspace_id is distinct from old.workspace_id or
    new.customer_id is distinct from old.customer_id or
    new.item_id is distinct from old.item_id or
    new.interaction_type_option_id is distinct from old.interaction_type_option_id or
    new.interaction_at is distinct from old.interaction_at or
    new.direction is distinct from old.direction or
    new.summary is distinct from old.summary or
    new.notes is distinct from old.notes or
    new.next_follow_up_at is distinct from old.next_follow_up_at or
    new.created_by is distinct from old.created_by or
    new.created_at is distinct from old.created_at
  ) then
    raise exception 'Interactions are append-only and cannot be edited after creation (only archived_at may change).';
  end if;
  return new;
end;
$$;

create trigger enforce_interaction_append_only
  before update on interactions
  for each row execute function public.enforce_interaction_append_only();

-- ============================================================================
-- Enable RLS on every table
-- ============================================================================

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table settings_options enable row level security;
alter table customers enable row level security;
alter table items enable row level security;
alter table interactions enable row level security;
alter table tasks enable row level security;
alter table activity_logs enable row level security;
alter table tags enable row level security;
alter table record_tags enable row level security;

-- ============================================================================
-- profiles
-- Users can always see/update their own profile, and can see (read-only)
-- the profiles of teammates they share a workspace with, e.g. to render
-- "Assigned to" and activity log actor names.
-- ============================================================================

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_select_teammates" on profiles
  for select using (shares_workspace_with(id));

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- No insert policy: rows are created only by the handle_new_user trigger
-- (SECURITY DEFINER), never directly by client code.

-- ============================================================================
-- workspaces
-- The workspace's own `id` plays the role of "workspace_id" here.
-- No insert policy: workspaces are created by the signup flow using the
-- service-role client (the new user has no membership yet, so RLS would
-- otherwise block the insert).
-- ============================================================================

create policy "workspaces_select" on workspaces
  for select using (is_workspace_member(id));

create policy "workspaces_update" on workspaces
  for update using (is_workspace_member(id)) with check (is_workspace_member(id));

-- ============================================================================
-- workspace_members
-- Members can see who else is in their workspace(s). No insert/update
-- policy for regular users in V1: membership rows are created by the
-- signup flow (service-role client). Team invites are a future feature.
-- ============================================================================

create policy "workspace_members_select" on workspace_members
  for select using (is_workspace_member(workspace_id));

-- ============================================================================
-- settings_options
-- ============================================================================

create policy "settings_options_select" on settings_options
  for select using (is_workspace_member(workspace_id));

create policy "settings_options_insert" on settings_options
  for insert with check (is_workspace_member(workspace_id));

create policy "settings_options_update" on settings_options
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- No delete policy: deactivate (is_active = false) instead of deleting,
-- so existing records that reference an option keep displaying its label.

-- ============================================================================
-- customers
-- ============================================================================

create policy "customers_select" on customers
  for select using (is_workspace_member(workspace_id));

create policy "customers_insert" on customers
  for insert with check (is_workspace_member(workspace_id));

create policy "customers_update" on customers
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- No delete policy: archive (archived_at) instead of deleting.

-- ============================================================================
-- items
-- ============================================================================

create policy "items_select" on items
  for select using (is_workspace_member(workspace_id));

create policy "items_insert" on items
  for insert with check (is_workspace_member(workspace_id));

create policy "items_update" on items
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- No delete policy: archive (archived_at) instead of deleting.

-- ============================================================================
-- interactions
-- Select + insert for any workspace member. Update is allowed by RLS (so
-- archiving can set archived_at) but the append-only trigger above blocks
-- changes to any other column, and server actions further restrict who
-- may call archive to Owner/Manager (Architecture Decision 002/003).
-- ============================================================================

create policy "interactions_select" on interactions
  for select using (is_workspace_member(workspace_id));

create policy "interactions_insert" on interactions
  for insert with check (is_workspace_member(workspace_id));

create policy "interactions_update" on interactions
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- No delete policy.

-- ============================================================================
-- tasks
-- ============================================================================

create policy "tasks_select" on tasks
  for select using (is_workspace_member(workspace_id));

create policy "tasks_insert" on tasks
  for insert with check (is_workspace_member(workspace_id));

create policy "tasks_update" on tasks
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- No delete policy: archive (archived_at) instead of deleting.

-- ============================================================================
-- activity_logs
-- Append-only: select + insert only, no update, no delete.
-- ============================================================================

create policy "activity_logs_select" on activity_logs
  for select using (is_workspace_member(workspace_id));

create policy "activity_logs_insert" on activity_logs
  for insert with check (is_workspace_member(workspace_id));

-- ============================================================================
-- tags
-- Plain labels, not audited business records, so full CRUD is fine.
-- ============================================================================

create policy "tags_select" on tags
  for select using (is_workspace_member(workspace_id));

create policy "tags_insert" on tags
  for insert with check (is_workspace_member(workspace_id));

create policy "tags_update" on tags
  for update using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy "tags_delete" on tags
  for delete using (is_workspace_member(workspace_id));

-- ============================================================================
-- record_tags
-- Join table: select/insert/delete only (there's nothing to "update" on a
-- tag link — you remove it and add a different one).
-- ============================================================================

create policy "record_tags_select" on record_tags
  for select using (is_workspace_member(workspace_id));

create policy "record_tags_insert" on record_tags
  for insert with check (is_workspace_member(workspace_id));

create policy "record_tags_delete" on record_tags
  for delete using (is_workspace_member(workspace_id));
