create table public.trips_clone (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  base_currency text not null default 'INR',
  owner_id uuid not null,
  join_code text not null unique default public.generate_unique_join_code(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips_clone enable row level security;

create policy "clone insert"
  on public.trips_clone for insert
  to authenticated
  with check (true);

notify pgrst, 'reload schema';
