-- Temporary diagnostic function — will be dropped once the trips INSERT
-- RLS issue is root-caused. Not part of the app's real surface area.
create function public.debug_trips_policies()
returns table (policyname text, cmd text, roles text, qual text, with_check text)
language sql
security definer set search_path = public
as $$
  select policyname, cmd, roles::text, qual::text, with_check::text
  from pg_policies
  where schemaname = 'public' and tablename = 'trips';
$$;

grant execute on function public.debug_trips_policies() to authenticated;
