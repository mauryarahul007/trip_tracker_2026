create function public.is_self(p_owner_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select p_owner_id = auth.uid();
$$;

alter table public.trips enable row level security;

drop policy if exists "creator becomes trip admin" on public.trips;

create policy "creator becomes trip admin"
  on public.trips for insert
  to authenticated
  with check (public.is_self(owner_id));

notify pgrst, 'reload schema';
