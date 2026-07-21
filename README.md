# Project Atlas

**Atlas** is a flexible sales and business logging system for item-based businesses (car dealerships, phone shops, real estate agencies, furniture stores, machinery traders, and similar). It is not built around any single industry — see [docs/product-requirements.md](docs/product-requirements.md) for the full product vision.

## V1 features

- **Auth & workspaces** — signup creates the user, their workspace, an owner membership, and default settings in one atomic flow.
- **Customers** — list with search/filters, detail page with timeline, duplicate-phone warning, archive (owner-only hard delete for mistake records with no history).
- **Items** — anything the business sells; categories/statuses are configurable, prices shown in the workspace currency.
- **Interactions** — the heart of the app; append-only log of every call, message, visit, and meeting. Setting a follow-up date atomically creates a follow-up task in the same database transaction.
- **Tasks** — Overdue / Due Today / Upcoming / Completed sections, Mark Done, assignment.
- **Dashboard** — stat cards, my tasks, recent customers/items/activity.
- **Settings** — owner/manager configuration of all dropdown options, workspace info, and tags. Renames keep stable machine keys; defaults can't be deactivated; nothing is hard-deleted.
- **Members** — owners add teammates (creates their login + sets their role), change roles, and suspend/remove — no SQL required. The workspace always keeps at least one owner.
- **Global search** — grouped `ilike` search across customers, items, tasks, and interactions.
- **Roles** — owner / manager / salesperson / staff, enforced in server actions; RLS enforces workspace isolation.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) (Postgres + Auth)
- Zod for validation, React Hook Form for forms
- pnpm as the package manager

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then copy `.env.example` to `.env.local` and fill in the values from **Project Settings -> API**:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to the browser. Used only by the signup flow and the dev seed script.

### 3. Run the database migrations

SQL migrations live in `database/migrations`, applied in filename order. Run them against your Supabase project with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push
```

(Or paste each migration file, in order, into the Supabase SQL editor.)

### 4. Generate database types

Never hand-write `types/database.types.ts` — always regenerate it after a schema change:

```bash
pnpm dlx supabase gen types typescript --project-id <your-project-ref> > types/database.types.ts
```

### 5. Seed development data

Auth users cannot be created with plain SQL. The seed script (`database/seed/seed.ts`) uses the Supabase Admin API (service role key, server-side only) to create three dev users, a workspace, and sample customers/items/interactions/tasks. See [docs/database-design.md](docs/database-design.md) for details. Run it with:

```bash
pnpm seed
```

Seeded dev logins (password `Password123!` for all):

| Role | Email |
| --- | --- |
| Owner | `owner@slktrading.test` |
| Manager | `manager@slktrading.test` |
| Salesperson | `salesperson@slktrading.test` |

You can also create a fresh workspace any time through the signup page.

### 6. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in, or sign up to create a new workspace.

## Project structure

See [docs/architecture-decisions.md](docs/architecture-decisions.md) and the folder layout below:

```
/app            Next.js routes ((auth) and (app) route groups)
/components     UI components (layout, forms, tables, timeline, ui)
/lib            Supabase clients, server actions, queries, validators, permissions
/database       SQL migrations and seed script
/docs           Product, database, architecture, and roadmap docs
/types          Generated database types + shared app types
```

## Documentation

- [Product requirements](docs/product-requirements.md)
- [Database design](docs/database-design.md)
- [Architecture decisions](docs/architecture-decisions.md)
- [Roadmap](docs/roadmap.md)
