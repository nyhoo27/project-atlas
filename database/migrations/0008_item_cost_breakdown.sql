-- 0008: Itemized cost breakdown.
--
-- An item's cost can be split into components (manufacturing,
-- shipping, customs, ...). Stored as a jsonb array of
-- { "label": text, "amount": number } on the item itself — this is
-- per-item line-item detail, not data queried across items, so a
-- separate table isn't warranted yet. When the breakdown is non-empty,
-- the server keeps items.cost_price equal to the sum of its amounts.

alter table public.items
  add column if not exists cost_breakdown jsonb not null default '[]';
