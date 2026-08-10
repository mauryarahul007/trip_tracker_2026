create table public.debug_fresh_table (
  id uuid primary key default gen_random_uuid(),
  note text
);

alter table public.debug_fresh_table enable row level security;

create policy "anyone authenticated can insert"
  on public.debug_fresh_table for insert
  to authenticated
  with check (true);

create policy "anyone authenticated can select"
  on public.debug_fresh_table for select
  to authenticated
  using (true);
