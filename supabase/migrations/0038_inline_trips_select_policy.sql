-- Testing a specific theory: trips' SELECT policy routes through
-- is_trip_participant() -> is_trip_admin(), which each run their OWN
-- separate nested `SELECT ... FROM trips WHERE id = ...` query. For the
-- RETURNING-clause visibility check on a row from the same INSERT
-- statement, that nested re-query may not see the just-inserted row yet.
-- Rewriting the admin half inline (no re-query of trips itself) to test
-- whether that's the actual trigger.
alter table public.trips enable row level security;

drop policy if exists "admins and participants can view their trip" on public.trips;
create policy "admins and participants can view their trip"
  on public.trips for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.members m where m.trip_id = trips.id and m.linked_user_id = auth.uid())
  );

notify pgrst, 'reload schema';
