-- Project Atlas V1 — updated_at triggers
-- Keeps updated_at current automatically on every UPDATE, so server
-- actions never need to set it by hand (and can't forget to).

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function set_updated_at() is 'Trigger function: sets updated_at = now() on every row update.';

create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();

create trigger set_updated_at before update on workspaces
  for each row execute function set_updated_at();

create trigger set_updated_at before update on settings_options
  for each row execute function set_updated_at();

create trigger set_updated_at before update on customers
  for each row execute function set_updated_at();

create trigger set_updated_at before update on items
  for each row execute function set_updated_at();

create trigger set_updated_at before update on interactions
  for each row execute function set_updated_at();

create trigger set_updated_at before update on tasks
  for each row execute function set_updated_at();

create trigger set_updated_at before update on tags
  for each row execute function set_updated_at();
