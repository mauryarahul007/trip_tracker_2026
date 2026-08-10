-- Trip Tracker: cloud storage + multi-user schema.
-- Run against a fresh Supabase project (SQL Editor, or `supabase db push`).

-- ============================================================================
-- profiles (one row per authenticated user, auto-populated from auth.users)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles are display metadata (name/avatar) shown to trip co-members;
-- readable by any signed-in user, editable only by the owner.
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- trips
-- ============================================================================

create function public.generate_unique_join_code()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
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

-- ============================================================================
-- members
-- ============================================================================

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
  where linked_user_id is not null; -- one claimed member per user per trip

alter table public.members enable row level security;

-- ---- RLS helper functions (SECURITY DEFINER to avoid recursive RLS lookups) ----

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

-- ---- trips policies (defined after helpers exist) ----

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

-- ---- members policies ----

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
-- NOTE: claiming a member (linked_user_id) is done via the claim_trip_member()
-- SECURITY DEFINER function below, not via a direct UPDATE policy, so an
-- unclaimed member can be claimed by a non-admin participant safely.

create policy "only admin deletes members"
  on public.members for delete
  to authenticated
  using (public.is_trip_admin(trip_id));

-- ============================================================================
-- groups + group_members
-- ============================================================================

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

-- ============================================================================
-- categories (per-trip; default categories are seeded client-side on trip
-- creation, this table just needs to hold them + any custom additions)
-- ============================================================================

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

-- ============================================================================
-- expenses (also used to represent settlements, is_settlement = true)
-- ============================================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  category text not null,
  date date not null,
  paid_by uuid not null references public.members (id),
  split_mode text not null check (split_mode in ('equal', 'equalUnit', 'custom', 'exact', 'percentage')),
  split_member_ids uuid[] not null,
  split_config jsonb,
  resolved_shares jsonb not null,
  receipt_path text, -- Supabase Storage object path, not inline base64
  is_settlement boolean not null default false,
  created_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_trip_id_idx on public.expenses (trip_id);
create index expenses_created_by_idx on public.expenses (created_by_user_id);

alter table public.expenses enable row level security;

-- A participant may create/edit/delete an expense they are involved in
-- (payer or a split participant) AND that they personally authored.
-- Admins are unrestricted. This single predicate covers both regular
-- expenses and settlements, since a settlement's paid_by/split_member_ids
-- already encode who's paying whom.
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

-- ============================================================================
-- join / claim flow (SECURITY DEFINER RPCs — a user isn't a trip participant
-- yet at this point, so normal table RLS above would hide everything).
-- ============================================================================

create function public.lookup_trip_by_join_code(p_code text)
returns table (
  trip_id uuid,
  trip_name text,
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
    return; -- empty result set = invalid code
  end if;

  return query
    select t.id, t.name, m.id, m.name
    from public.trips t
    join public.members m on m.trip_id = t.id
    where t.id = v_trip_id
      and m.linked_user_id is null
      and m.archived = false;
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

-- ============================================================================
-- Storage bucket for receipt images (replaces inline base64 in expenses)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

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
-- Expected object path convention: receipts/{trip_id}/{expense_id}.jpg
