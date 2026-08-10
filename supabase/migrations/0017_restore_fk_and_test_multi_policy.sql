alter table public.trips
  add constraint trips_owner_id_fkey foreign key (owner_id) references public.profiles (id) on delete cascade;

create policy "debug update"
  on public.debug_fresh_table for update
  to authenticated
  using (true)
  with check (true);

create policy "debug delete"
  on public.debug_fresh_table for delete
  to authenticated
  using (true);
