-- 0012: Sales move stock.
--
-- Recording a sale now reduces the item's quantity, editing a sale
-- adjusts by the difference, and archiving a sale puts the stock back.
--
-- This lives in a database trigger rather than in the server action on
-- purpose: it runs inside the same transaction as the sale itself, so
-- stock and sales can never drift apart, and it applies to every path
-- that writes a sale — including anything added later.

-- Selling the last unit must be allowed to leave zero. The original
-- constraint (>= 1) would have rejected it.
alter table public.items drop constraint if exists items_quantity_check;
alter table public.items add constraint items_quantity_check check (quantity >= 0);

/*
 * How many units a sale row is currently holding out of stock.
 * Archived sales hold nothing (the stock came back), and cancelled or
 * refunded sales never took any.
 */
create or replace function public.sale_stock_units(
  p_quantity integer,
  p_status_option_id uuid,
  p_archived_at timestamptz
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_archived_at is not null then 0
    when p_status_option_id is not null
      and (select value from settings_options where id = p_status_option_id)
          in ('cancelled', 'refunded')
      then 0
    else coalesce(p_quantity, 0)
  end
$$;

comment on function public.sale_stock_units(integer, uuid, timestamptz) is
  'Units of stock a sale row currently consumes. Archived, cancelled and refunded sales consume none.';

create or replace function public.apply_sale_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release integer := 0;
  v_take integer := 0;
  v_available integer;
begin
  -- Put back whatever the previous version of this row was holding.
  if tg_op in ('UPDATE', 'DELETE') and old.item_id is not null then
    v_release := sale_stock_units(old.quantity, old.status_option_id, old.archived_at);
    if v_release <> 0 then
      update items set quantity = quantity + v_release where id = old.item_id;
    end if;
  end if;

  -- Take what the new version needs.
  if tg_op in ('INSERT', 'UPDATE') and new.item_id is not null then
    v_take := sale_stock_units(new.quantity, new.status_option_id, new.archived_at);
    if v_take <> 0 then
      -- FOR UPDATE serialises two people selling the same item at once,
      -- so the stock count can't be lost to a race.
      select quantity into v_available from items where id = new.item_id for update;

      if v_available is null then
        raise exception 'Item not found for this sale' using errcode = 'P0001';
      end if;

      if v_available < v_take then
        raise exception 'Not enough stock: only % left', v_available
          using errcode = 'P0001';
      end if;

      update items set quantity = quantity - v_take where id = new.item_id;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.apply_sale_stock() is
  'Keeps items.quantity in step with sales. Runs in the sale''s own transaction and locks the item row, so stock cannot drift or be lost to concurrent sales.';

drop trigger if exists apply_sale_stock on public.sales;

create trigger apply_sale_stock
  after insert or update or delete on public.sales
  for each row execute function public.apply_sale_stock();
