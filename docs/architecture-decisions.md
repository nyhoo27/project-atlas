# Architecture Decisions

## 001 — Option B modular architecture

Project Atlas V1 uses **Option B**: fixed core modules with configurable settings, not a fully dynamic custom-module builder.

- Core modules (Customers, Items, Interactions, Tasks, Settings, Users, Dashboard) are hardcoded tables and pages.
- What's configurable is the *data inside* those modules: categories, statuses, sources, interaction types, task priorities, and tags — all stored in `settings_options` (see [database-design.md](database-design.md)) and managed from Settings, never hardcoded in forms.
- V1 does not let users define entirely new modules, custom fields, or a Notion/Airtable-style schema builder. That's a V3+ concern (see [roadmap.md](roadmap.md)).

**Why:** a fully dynamic platform is a much bigger, riskier build. Option B gets a working, industry-agnostic product to users faster, while the `settings_options` pattern keeps the door open for a custom-field builder later without a schema rewrite.

## 002 — Role-based permissions live in server actions, not RLS

Row Level Security enforces **workspace isolation only** — a user can only read/write rows in a workspace where they're an active member (via the `is_workspace_member()` helper, see [database-design.md](database-design.md)).

Role logic (Owner / Manager / Salesperson / Staff — e.g. "only Owner or Manager can archive a record" or "only Owner or Manager can access Settings") is enforced in application code, in a shared `lib/permissions` helper called from every server action that needs it.

**Why:** encoding four roles' worth of conditional logic into Postgres RLS policies is complex to write correctly and hard to debug when it's wrong — silent 0-row results instead of clear error messages. Keeping role checks in TypeScript server actions makes them readable, testable, and easy to extend as roles evolve, while RLS still guarantees the one thing that must never fail: workspace isolation. Stricter role-based RLS can be layered in later if needed.

## 003 — Interactions are append-only

Once created, an `interactions` row cannot be edited — only archived (`archived_at`), and only by Owner or Manager. This is enforced twice:

1. **RLS**: `interactions_update` policy still allows an authenticated workspace member to `UPDATE`, because archiving requires it.
2. **Database trigger**: `enforce_interaction_append_only` (in `0005_rls.sql`) rejects any `UPDATE` that changes a column other than `archived_at`, regardless of who or what issues it.
3. **Server action**: only exposes an `archiveInteraction` action (no `updateInteraction`), and that action checks the caller is Owner/Manager per Architecture Decision 002.

**Why:** interactions are the source of truth for "what actually happened with this customer." If they could be silently edited after the fact, the activity history couldn't be trusted — which defeats the app's central business rule that every touchpoint gets logged. Making this a hard database-level constraint (not just a missing "edit" button in the UI) means it holds even if a future server action has a bug.

## Future-proofing

None of the above blocks adding, later:

- Sales, payments, expenses (new tables, same `workspace_id` pattern)
- Files (Supabase Storage, referenced from existing tables)
- Custom fields (a `custom_field_values` jsonb column or table, additive)
- Notifications, reports, a permission builder, multi-workspace switching

Every business table already carries `workspace_id`, `archived_at` (soft-archive, not hard-delete), and references `settings_options` instead of hardcoded enums — the three patterns that make future modules additive rather than migrations that touch existing data.
