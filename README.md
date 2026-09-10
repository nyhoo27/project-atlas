# Project Atlas

**Atlas** is a flexible sales and business logging system for item-based businesses (car dealerships, phone shops, real estate agencies, furniture stores, machinery traders, and similar). It is not built around any single industry — see [docs/product-requirements.md](docs/product-requirements.md) for the full product vision.

## V1 features

- **Auth & workspaces** — signup creates the user, their workspace, an owner membership, and default settings in one atomic flow.
- **Customers** — list with search/filters, detail page with timeline, duplicate-phone warning, archive (owner-only hard delete for mistake records with no history).
- **Items** — anything the business sells; categories/statuses are configurable, prices shown in the workspace currency.
- **Suppliers** — who you buy from, with contact details, linked to the items sourced from them. Owner/manager only, like item costs.
- **Interactions** — the heart of the app; append-only log of every call, message, visit, and meeting. Setting a follow-up date atomically creates a follow-up task in the same database transaction.
- **Sales (V2)** — record what was sold, to whom, when, for how much, and by whom. Each sale snapshots the item's cost at sale time, so profit stays fixed even if the item's cost is edited later. Sales show on customer and item pages; the dashboard shows this month's sales, revenue, and profit.
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
- `SIGNUP_INVITE_CODE` — server-only. Creating a workspace requires this code, so signup isn't open to anyone who finds the URL. **Leave it unset and signup is closed entirely** (existing users can still log in). Share the code only with people who should get their own workspace; to add someone to *your* workspace, use Settings → Members instead.

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

### 5. Run the dev server

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

## Live Demo

[View the live Demo](https://project-atlas-five-sand.vercel.app/login)  
Invite code: 'alpha-atlas'

## Documentation

- [Product requirements](docs/product-requirements.md)
- [Database design](docs/database-design.md)
- [Architecture decisions](docs/architecture-decisions.md)
- [Roadmap](docs/roadmap.md)
