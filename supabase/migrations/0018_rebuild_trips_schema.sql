-- Full rebuild of everything except `profiles` (untouched — has real data
-- and wasn't part of the churn). Root cause: after ~17 migrations of DDL
-- churn on `trips` (drop/recreate policy x3, drop/add FK, etc.) inserts via
-- PostgREST consistently hit "new row violates row-level security policy"
-- even with `WITH CHECK (true)`, while the identical raw SQL succeeded and
-- a brand-new table with an identical policy shape worked fine via REST
-- too — isolating it to stale catalog/cache state tied to this specific
-- relation's OID, not the schema or policy logic. All app tables are
-- empty, so a clean rebuild is safe and sidesteps the issue entirely by
-- giving `trips` (and everything under it) a fresh OID.

-- Clean up every diagnostic object from this investigation.
drop table if exists public.debug_fresh_table cascade;
drop function if exists public.debug_trips_policies() cascade;
drop function if exists public.debug_auth_context() cascade;
drop function if exists public.debug_insert_trip(text) cascade;
drop function if exists public.debug_bool_check(uuid) cascade;
drop function if exists public.debug_current_role() cascade;
drop function if exists public.debug_rls_state() cascade;
drop function if exists public.debug_table_grants() cascade;

-- Drop the churned schema, in dependency order, down through the helper
-- functions and RPCs. Storage policies reference is_trip_participant, so
-- those go first.
drop policy if exists "trip participants can read receipts" on storage.objects;
drop policy if exists "trip participants can upload receipts" on storage.objects;

drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.members cascade;
drop table if exists public.trips cascade;

drop function if exists public.lookup_trip_by_join_code(text) cascade;
drop function if exists public.claim_trip_member(uuid) cascade;
drop function if exists public.is_trip_admin(uuid) cascade;
drop function if exists public.is_trip_participant(uuid) cascade;
drop function if exists public.my_member_id(uuid) cascade;
drop function if exists public.generate_unique_join_code() cascade;

-- ============================================================================
-- Rebuild, fresh.
-- ============================================================================

create function public.generate_unique_join_code()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  exists_already boolean;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.trips t where t.join_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  base_currency text not null default 'INR',
  owner_id uuid not null references public.profiles (id) on delete cascade,
  join_code text not null unique default public.generate_unique_join_code(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_owner_id_idx on public.trips (owner_id);
alter table public.trips enable row level security;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  linked_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_trip_id_idx on public.members (trip_id);
create unique index members_trip_linked_user_unique on public.members (trip_id, linked_user_id)
  where linked_user_id is not null;
alter table public.members enable row level security;

create function public.is_trip_admin(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.owner_id = auth.uid()
  );
$$;

create function public.is_trip_participant(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_trip_admin(p_trip_id) or exists (
    select 1 from public.members m
    where m.trip_id = p_trip_id and m.linked_user_id = auth.uid()
  );
$$;

create function public.my_member_id(p_trip_id uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select m.id from public.members m
  where m.trip_id = p_trip_id and m.linked_user_id = auth.uid()
  limit 1;
$$;

create policy "admins and participants can view their trip"
  on public.trips for select
  to authenticated
  using (public.is_trip_participant(id));

create policy "creator becomes trip admin"
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "only admin can update trip"
  on public.trips for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "only admin can delete trip"
  on public.trips for delete
  to authenticated
  using (owner_id = auth.uid());

create policy "trip participants can view members"
  on public.members for select
  to authenticated
  using (public.is_trip_participant(trip_id));

create policy "only admin manages members"
  on public.members for insert
  to authenticated
  with check (public.is_trip_admin(trip_id));

create policy "only admin updates members directly"
  on public.members for update
  to authenticated
  using (public.is_trip_admin(trip_id))
  with check (public.is_trip_admin(trip_id));

create policy "only admin deletes members"
  on public.members for delete
  to authenticated
  using (public.is_trip_admin(trip_id));

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index groups_trip_id_idx on public.groups (trip_id);
alter table public.groups enable row level security;

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (group_id, member_id)
);

alter table public.group_members enable row level security;

create policy "trip participants can view groups"
  on public.groups for select
  to authenticated
  using (public.is_trip_participant(trip_id));

create policy "only admin manages groups"
  on public.groups for all
  to authenticated
  using (public.is_trip_admin(trip_id))
  with check (public.is_trip_admin(trip_id));

create policy "trip participants can view group members"
  on public.group_members for select
  to authenticated
  using (
    exists (select 1 from public.groups g where g.id = group_id and public.is_trip_participant(g.trip_id))
  );

create policy "only admin manages group members"
  on public.group_members for all
  to authenticated
  using (
    exists (select 1 from public.groups g where g.id = group_id and public.is_trip_admin(g.trip_id))
  )
  with check (
    exists (select 1 from public.groups g where g.id = group_id and public.is_trip_admin(g.trip_id))
  );

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  icon text,
  is_custom boolean not null default true,
  created_at timestamptz not null default now()
);

create index categories_trip_id_idx on public.categories (trip_id);
alter table public.categories enable row level security;

create policy "trip participants can view categories"
  on public.categories for select
  to authenticated
  using (public.is_trip_participant(trip_id));

create policy "only admin manages categories"
  on public.categories for all
  to authenticated
  using (public.is_trip_admin(trip_id))
  with check (public.is_trip_admin(trip_id));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  category text not null,
  date date not null,
  paid_by uuid not null, -- intentionally no FK: deleting a member with expenses
                          -- must still succeed, leaving a dangling reference
                          -- the UI renders as "[Deleted Member]"
  split_mode text not null check (split_mode in ('equal', 'equalUnit', 'custom', 'exact', 'percentage')),
  split_member_ids uuid[] not null,
  split_config jsonb,
  resolved_shares jsonb not null,
  receipt_path text,
  is_settlement boolean not null default false,
  created_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_trip_id_idx on public.expenses (trip_id);
create index expenses_created_by_idx on public.expenses (created_by_user_id);
alter table public.expenses enable row level security;

create policy "trip participants can view expenses"
  on public.expenses for select
  to authenticated
  using (public.is_trip_participant(trip_id));

create policy "admin or involved participant can create expenses"
  on public.expenses for insert
  to authenticated
  with check (
    public.is_trip_admin(trip_id)
    or (
      public.is_trip_participant(trip_id)
      and created_by_user_id = auth.uid()
      and (paid_by = public.my_member_id(trip_id) or public.my_member_id(trip_id) = any (split_member_ids))
    )
  );

create policy "admin or original author can update expenses"
  on public.expenses for update
  to authenticated
  using (
    public.is_trip_admin(trip_id) or created_by_user_id = auth.uid()
  )
  with check (
    public.is_trip_admin(trip_id)
    or (
      created_by_user_id = auth.uid()
      and (paid_by = public.my_member_id(trip_id) or public.my_member_id(trip_id) = any (split_member_ids))
    )
  );

create policy "admin or original author can delete expenses"
  on public.expenses for delete
  to authenticated
  using (
    public.is_trip_admin(trip_id) or created_by_user_id = auth.uid()
  );

create function public.lookup_trip_by_join_code(p_code text)
returns table (
  trip_id uuid,
  trip_name text,
  is_admin boolean,
  my_member_id uuid,
  member_id uuid,
  member_name text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select t.id into v_trip_id from public.trips t where t.join_code = upper(p_code);

  if v_trip_id is null then
    return;
  end if;

  return query
    select
      t.id,
      t.name,
      (t.owner_id = auth.uid()),
      (select m2.id from public.members m2 where m2.trip_id = t.id and m2.linked_user_id = auth.uid() limit 1),
      m.id,
      m.name
    from public.trips t
    left join public.members m
      on m.trip_id = t.id and m.linked_user_id is null and m.archived = false
    where t.id = v_trip_id;
end;
$$;

create function public.claim_trip_member(p_member_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.members
  set linked_user_id = auth.uid(), updated_at = now()
  where id = p_member_id
    and linked_user_id is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

grant execute on function public.lookup_trip_by_join_code(text) to authenticated;
grant execute on function public.claim_trip_member(uuid) to authenticated;

create policy "trip participants can read receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "trip participants can upload receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

notify pgrst, 'reload schema';
