-- Restore the real policy (0011 temporarily replaced it with `WITH CHECK
-- (true)` for diagnostic purposes).
drop policy if exists "creator becomes trip admin" on public.trips;

create policy "creator becomes trip admin"
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Supabase normally auto-notifies PostgREST to reload its schema/role
-- cache after DDL via an event trigger, but after ~13 migrations applied
-- in rapid succession here, force it explicitly to rule out staleness.
notify pgrst, 'reload schema';
