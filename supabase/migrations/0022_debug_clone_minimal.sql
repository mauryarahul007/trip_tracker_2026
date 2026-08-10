create table public.trips_clone3 (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null
);

alter table public.trips_clone3 enable row level security;

create policy "clone3 insert"
  on public.trips_clone3 for insert
  to authenticated
  with check (true);

notify pgrst, 'reload schema';
