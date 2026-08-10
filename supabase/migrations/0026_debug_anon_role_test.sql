create policy "clone4 anon insert"
  on public.trips_clone4 for insert
  to anon
  with check (true);

notify pgrst, 'reload schema';
