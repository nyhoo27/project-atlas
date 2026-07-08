-- Project Atlas V1 — auto-create profile on signup
-- Standard Supabase pattern: a SECURITY DEFINER function + trigger on
-- auth.users inserts a matching profiles row whenever a new auth user is
-- created. The client never inserts into profiles directly.
--
-- full_name is read from the auth user's metadata, which the signup
-- server action sets via supabase.auth.signUp({ options: { data: { full_name } } }).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Creates a profiles row for every new auth.users row. SECURITY DEFINER so it can insert despite RLS.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
