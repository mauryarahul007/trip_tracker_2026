-- Real superadmin identity. Deliberately its own table, not a column on
-- profiles: profiles already has an "update your own profile" policy with
-- no column restriction, so a boolean flag there would let any signed-in
-- user self-promote via a normal profile update. This table grants no
-- policies to anon/authenticated at all -- only service_role (which
-- bypasses RLS) can ever insert into it.
create table public.superadmins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.superadmins enable row level security;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.superadmins s where s.user_id = auth.uid()
  );
$$;

-- Every other admin-gated policy (members, groups, categories, expenses)
-- already routes through is_trip_admin(), so superadmin bypass lands
-- everywhere for free by updating this one function.
create or replace function public.is_trip_admin(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_superadmin() or exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.owner_id = auth.uid()
  );
$$;

-- trips' own UPDATE/DELETE policies checked owner_id directly instead of
-- going through is_trip_admin() -- route them through it too so freeze/
-- archive/delete-by-superadmin inherit the same bypass.
drop policy if exists "only admin can update trip" on public.trips;
create policy "only admin can update trip"
  on public.trips for update
  to authenticated
  using (public.is_trip_admin(id))
  with check (public.is_trip_admin(id));

drop policy if exists "only admin can delete trip" on public.trips;
create policy "only admin can delete trip"
  on public.trips for delete
  to authenticated
  using (public.is_trip_admin(id));

notify pgrst, 'reload schema';
