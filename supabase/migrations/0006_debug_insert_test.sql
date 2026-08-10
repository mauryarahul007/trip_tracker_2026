-- Temporary diagnostic function — will be dropped alongside the others.
-- SECURITY INVOKER (the default) so it runs as the calling `authenticated`
-- role, subject to RLS exactly like a direct REST insert would be.
create function public.debug_insert_trip(p_name text)
returns public.trips
language plpgsql
as $$
declare
  v_row public.trips;
begin
  insert into public.trips (name, start_date, end_date, base_currency, owner_id)
  values (p_name, '2026-08-14', '2026-08-19', 'INR', auth.uid())
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.debug_insert_trip(text) to authenticated;
