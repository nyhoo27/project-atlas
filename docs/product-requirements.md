# Product Requirements

## Product vision

**Atlas** is a flexible sales and business logging system for item-based businesses. It is not built for any single industry — a car dealership, a phone shop, a real estate agency, a furniture store, a machinery trader, and a watch seller should all be able to run their day-to-day customer and sales activity through the same core modules.

The central business rule the whole product is designed around:

> **No customer interaction should happen without being logged.** Every call, message, visit, meeting, negotiation, question, complaint, or follow-up should become an Interaction record.

The core workflow:

```
Customer asks about item
  → user logs an interaction
  → user sets a follow-up
  → system creates a task
  → dashboard shows what needs attention
  → timeline keeps the full history
```

## Target users

Small-to-medium item-based businesses that currently track customers and sales activity informally (notebooks, spreadsheets, or scattered chat apps) and need a lightweight, shared system for their team — owners, sales managers, salespeople, and general staff.

## Architecture approach

Project Atlas V1 uses **Option B: modular architecture** — see [Architecture Decision 001](architecture-decisions.md). Core modules (Customers, Items, Interactions, Tasks, Settings, Users, Dashboard) are fixed, but the *values* within them (categories, statuses, sources, interaction types, priorities, tags) are configurable per workspace via Settings. V1 does not build a fully dynamic, Notion/Airtable-style custom module builder.

## V1 scope

Must build:

1. Authentication (signup + login)
2. Workspace foundation
3. Dashboard
4. Customers
5. Items
6. Interactions
7. Tasks / Follow-ups
8. Settings
9. Activity Log
10. Basic Search
11. Basic Role Support (Owner / Manager / Salesperson / Staff)

Tags and Global Search are the lowest-priority V1 features — built last, and cuttable without breaking the core workflow if time runs short.

## Core modules

- **Customers** — people or companies who may buy something.
- **Items** — anything a workspace sells (generic on purpose: not "vehicles" or "products").
- **Interactions** — every logged customer touchpoint; append-only (see [Architecture Decision 003](architecture-decisions.md)).
- **Tasks** — manual follow-ups, or auto-created from an interaction's follow-up date.
- **Settings** — workspace info + configurable dropdown options + tags.
- **Activity Log** — a human-readable history feed on the dashboard and on customer/item detail pages.
- **Dashboard** — the daily-use overview: what's due, what's overdue, what happened recently.

## Non-goals for V1

Explicitly out of scope until a later version:

- Payments, invoices, accounting, expenses, sales commissions
- AI assistant, automation builder
- WhatsApp/Email API integrations
- Advanced permissions builder, custom field builder
- Drag-and-drop dashboard builder
- Mobile app, offline mode, multi-language support
- Complex analytics, advanced document management
- Public customer portal

The database is shaped so these can be added later without a rewrite (see "Future-proofing" in [architecture-decisions.md](architecture-decisions.md)), but no UI or business logic for them exists in V1.

## Future roadmap

See [roadmap.md](roadmap.md) for the full V1 → V4 plan.
