create function public.debug_trips_constraints()
returns table (conname text, contype text)
language sql
security definer set search_path = public
as $$
  select conname::text, contype::text from pg_constraint
  where conrelid = 'public.trips'::regclass;
$$;
grant execute on function public.debug_trips_constraints() to authenticated;
