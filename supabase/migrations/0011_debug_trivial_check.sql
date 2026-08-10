drop policy if exists "creator becomes trip admin" on public.trips;

create policy "creator becomes trip admin"
  on public.trips for insert
  to authenticated
  with check (true);
