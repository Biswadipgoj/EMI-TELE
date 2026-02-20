-- Ensures every authenticated user has a usable profile row.
-- Fixes: "Account role not configured" and retailer dashboards showing no customers.

create or replace function public.ensure_profile()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  -- Decide role in a deterministic way
  if v_email is not null and lower(v_email) in ('telepoint@telepoint.local', 'telepoint@admin.local') then
    v_role := 'super_admin';
  elsif exists (select 1 from public.retailers r where r.auth_user_id = auth.uid()) then
    v_role := 'retailer';
  else
    -- We don't use Supabase Auth for customers (they use Aadhaar+Mobile login)
    v_role := 'customer';
  end if;

  insert into public.profiles (user_id, role)
  values (auth.uid(), v_role)
  on conflict (user_id) do update
    set role = excluded.role;

  return v_role;
end;
$$;

grant execute on function public.ensure_profile() to authenticated;
