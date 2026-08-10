create table public.trips_clone4 (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

alter table public.trips_clone4 enable row level security;

create policy "clone4 insert"
  on public.trips_clone4 for insert
  to authenticated
  with check (true);

notify pgrst, 'reload schema';
