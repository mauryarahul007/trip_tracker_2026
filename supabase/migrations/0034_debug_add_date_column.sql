create table public.members_clone (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  name text not null,
  test_date date not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.members_clone enable row level security;

create policy "clone insert"
  on public.members_clone for insert
  to authenticated
  with check (true);

notify pgrst, 'reload schema';
