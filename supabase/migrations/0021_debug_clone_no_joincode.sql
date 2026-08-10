create table public.trips_clone2 (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  base_currency text not null default 'INR',
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips_clone2 enable row level security;

create policy "clone2 insert"
  on public.trips_clone2 for insert
  to authenticated
  with check (true);

notify pgrst, 'reload schema';
