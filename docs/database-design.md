# Database Design

Project Atlas uses Supabase PostgreSQL. All migrations live in `database/migrations`, applied in filename order (`0001_...`, `0002_...`, ...). Types are generated from the live schema with `supabase gen types typescript` into `types/database.types.ts` — never hand-written.

## Tables

### profiles

One row per Supabase Auth user (`auth.users`), created automatically by the `handle_new_user` trigger (see below) — the client never inserts into `profiles` directly. Stores `full_name`, `email`, `phone`, `avatar_url`.

### workspaces

One row per business (e.g. "SLK Trading"). Every other business table hangs off a `workspace_id`. Has `currency` (default `MMK`) and `timezone` (default `Asia/Yangon`) so display formatting is workspace-specific. Soft-archived via `archived_at`, never deleted.

### workspace_members

Links a `user_id` to a `workspace_id` with a `role` (`owner` / `manager` / `salesperson` / `staff`) and a `status` (`active` / `invited` / `suspended`). Unique on `(workspace_id, user_id)` — a user can't join the same workspace twice. In V1, rows are only created by the signup flow (service-role client); there's no "invite teammate" UI yet, so no client-facing insert/update policy exists for this table.

### settings_options

Configurable dropdown values, replacing what would otherwise be hardcoded enums. `option_type` groups rows (`item_category`, `item_status`, `customer_source`, `interaction_type`, `task_status`, `task_priority`); `label` is shown in the UI, `value` is the stable machine key. `is_default` marks the option a new record's form should pre-select. `is_active` lets a workspace retire an option without breaking existing records that reference it — deactivated options are hidden from new-record forms but still render correctly wherever they're already used. Unique on `(workspace_id, option_type, value)`.

Defaults are seeded by the shared `seed_default_settings_options(workspace_id)` Postgres function (`0006_seed_settings_function.sql`), called by both the signup flow and `database/seed/seed.ts`, so the two never drift apart.

### customers

A person or company who may buy something. Optionally linked to a `source_option_id` (settings_options) and an `assigned_to` user. Soft-archived via `archived_at`.

### items

Anything a workspace sells — deliberately generic, not "products" or "vehicles", so a car dealership and a phone shop use the same table. Linked to `category_option_id` and `status_option_id`. `cost_price` / `selling_price` are `numeric(14,2)` and checked non-negative; `quantity` defaults to 1 and is checked `>= 1`. Soft-archived via `archived_at`.

### interactions

Every logged customer touchpoint (call, message, visit, meeting, complaint, ...) — the heart of the app. Links to a `customer_id` (`on delete set null`, strongly recommended but not required) and optionally an `item_id`. **Append-only**: a database trigger (`enforce_interaction_append_only`, in `0005_rls.sql`) rejects any `UPDATE` that changes a column other than `archived_at`, so even a bug in application code can't silently edit a logged interaction — see [Architecture Decision 003](architecture-decisions.md). Archiving is still an `UPDATE` (setting `archived_at`), restricted to Owner/Manager in server actions, not in RLS.

### tasks

Follow-ups and internal work. May be created manually or auto-created from an interaction's `next_follow_up_at` (in which case `interaction_id` links back to it). Linked to `status_option_id` / `priority_option_id`, and optionally `customer_id` / `item_id`. `completed_at` is set when status moves to Done.

### activity_logs

Human-readable history feed (`"Mg Mg logged a WhatsApp Message with Ko Aung"`) shown on the dashboard and on customer/item timelines. Written **server-side only** — server actions and database functions insert rows; there is no path for client code to write one. Append-only: select + insert policies only, no update/delete.

### tags / record_tags

`tags` holds free-form labels per workspace (unique on `(workspace_id, name)`). `record_tags` joins a `tag_id` to a `record_type` (`customer` | `item`) + `record_id`, unique on `(tag_id, record_type, record_id)` so the same tag can't be applied twice. Both are simple, fully-CRUD tables — they aren't audited business records, so (unlike customers/items/tasks) they can be hard-deleted when a tag or tag link is removed.

## Key relationships

- Every business table carries `workspace_id → workspaces.id`. This is the sole unit of tenant isolation.
- `customers.source_option_id`, `items.category_option_id` / `status_option_id`, `interactions.interaction_type_option_id`, `tasks.status_option_id` / `priority_option_id` all point at `settings_options.id` — never at a hardcoded enum.
- `interactions.customer_id` / `interactions.item_id` are `on delete set null`: archiving/removing a customer or item shouldn't destroy the interaction history, just detach it.
- `tasks.interaction_id` links a follow-up task back to the interaction that created it (only set for auto-created follow-ups).
- `workspace_members` is the only table that says who can do what — everything else is reached transitively through `workspace_id`.

## Row Level Security

RLS enforces **workspace isolation only** — it never encodes role logic. See [Architecture Decision 002](architecture-decisions.md).

**The recursion trap:** a policy defined *on* `workspace_members` that queries `workspace_members` in its own `USING` clause causes infinite recursion in Postgres, because evaluating the policy re-triggers the same policy. The fix, used throughout `0005_rls.sql`, is a `SECURITY DEFINER` helper function:

```sql
create function is_workspace_member(p_workspace_id uuid) returns boolean
security definer
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and status = 'active'
  );
$$ language sql;
```

Being `SECURITY DEFINER`, the function's internal query runs with elevated privileges and bypasses RLS, so it can safely read `workspace_members` without re-entering the policy that calls it. Every table's policies call `is_workspace_member(workspace_id)` rather than duplicating this join inline.

A second helper, `shares_workspace_with(user_id)`, lets a user read (not write) the `profiles` of teammates they share a workspace with — needed to render names for "Assigned to" and activity log actors.

General shape of the policies (see `0005_rls.sql` for the full list):

- **SELECT**: `is_workspace_member(workspace_id)`
- **INSERT**: `with check (is_workspace_member(workspace_id))`
- **UPDATE**: `using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id))`
- **DELETE**: no policy for business records (customers, items, interactions, tasks, settings_options, activity_logs) — see below. `tags` and `record_tags` do have delete policies, since they aren't audited business records.

`workspaces` is the one exception to the "policy on `workspace_id` column" shape, since a workspace row's own `id` plays that role: policies use `is_workspace_member(id)`.

## Database functions

Beyond `is_workspace_member()` and `handle_new_user()` (described above), two functions carry business logic that must be transactional or shared:

- **`seed_default_settings_options(p_workspace_id)`** — inserts the default categories, statuses, sources, types, and priorities for a new workspace. Called by the signup flow and the dev seed script, so both use one source of truth.
- **`create_interaction_with_follow_up(...)`** (migration `0007`) — the atomic write behind "log interaction": inserts the interaction, its activity log, and — when a follow-up date is given — the follow-up task plus its activity log in **one transaction**. An interaction can never save while its follow-up task silently fails. It is `SECURITY INVOKER`, so RLS workspace isolation applies to every statement inside it. Optional parameters default to `null` so the generated TypeScript types mark them optional.

## Soft archive rule

Customers, items, interactions, tasks, and settings_options are never hard-deleted from the app. Each has an `archived_at timestamptz` (or, for settings_options, an `is_active boolean`) that server actions set instead of running `DELETE`. Archived records:

- are excluded from list pages by default,
- still show up when a "Show archived" toggle is on,
- keep every foreign key relationship intact (so past interactions, tasks, and activity log entries referencing them still render correctly).

No table has a DELETE RLS policy except `tags` and `record_tags`, which aren't business records subject to this rule.

One deliberate exception: the workspace owner can permanently delete a **customer with zero logged interactions** (a record created by mistake). This runs through the service-role client after server-side checks — see Architecture Decision 004 in [architecture-decisions.md](architecture-decisions.md).
