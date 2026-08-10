create table public.trips_clone5 (
  id uuid primary key default gen_random_uuid(),
  note text not null
);

alter table public.trips_clone5 enable row level security;

create policy "clone5 insert"
  on public.trips_clone5 for insert
  to authenticated
  with check (true);

notify pgrst, 'reload schema';
