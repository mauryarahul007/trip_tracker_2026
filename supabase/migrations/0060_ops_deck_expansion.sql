-- ============================================================================
-- Migration 0060: Ops Deck Expansion
-- Backs the superadmin dashboard additions: account suspension, a generic
-- app_config store (maintenance mode, signup gate, join rate limits,
-- recycle-bin retention), fleet-wide broadcast notifications, and a
-- manual recycle-bin purge. Each piece is superadmin-gated at the RPC
-- level (defense in depth even where RLS already blocks non-admins).
-- ============================================================================

-- ---- account suspension ----

alter table public.profiles add column if not exists banned boolean not null default false;

create or replace function public.is_banned()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select p.banned from public.profiles p where p.id = auth.uid()), false);
$$;

-- Every read/write policy across trips/members/groups/categories/expenses
-- routes through one of these two functions (see 0057) -- gating ban here
-- blocks a suspended user everywhere in one diff, no per-table policy edits.
create or replace function public.is_trip_participant(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select (not public.is_banned()) and (
    public.is_superadmin() or exists (
      select 1 from public.members m
      where m.trip_id = p_trip_id and m.linked_user_id = auth.uid()
    )
  );
$$;

create or replace function public.is_trip_admin(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select (not public.is_banned()) and (
    public.is_superadmin() or exists (
      select 1 from public.trips t
      where t.id = p_trip_id and t.owner_id = auth.uid()
    )
  );
$$;

-- trips' own SELECT/INSERT policies inline the check instead of calling
-- is_trip_participant() (see 0038/0057's comment) -- update both directly.
drop policy if exists "admins and participants can view their trip" on public.trips;
create policy "admins and participants can view their trip"
  on public.trips for select
  to authenticated
  using (
    (not public.is_banned()) and (
      public.is_superadmin()
      or owner_id = auth.uid()
      or exists (select 1 from public.members m where m.trip_id = trips.id and m.linked_user_id = auth.uid())
    )
  );

drop policy if exists "creator becomes trip admin" on public.trips;
create policy "creator becomes trip admin"
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid() and not public.is_banned());

create or replace function public.set_user_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  if exists (select 1 from public.superadmins s where s.user_id = p_user_id) then
    raise exception 'Cannot suspend a superadmin account.';
  end if;
  update public.profiles set banned = p_banned where id = p_user_id;
end;
$$;

grant execute on function public.set_user_banned(uuid, boolean) to authenticated;

-- ---- generic app_config store ----
-- One key/value table instead of one-off tables per setting: backs
-- maintenance mode, signup gate, join rate limits, recycle-bin retention.

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

create or replace function public.get_app_config()
returns setof public.app_config
language sql
security definer set search_path = public
stable
as $$
  select * from public.app_config where public.is_superadmin();
$$;

grant execute on function public.get_app_config() to authenticated;

create or replace function public.set_app_config(p_key text, p_value jsonb)
returns public.app_config
language plpgsql
security definer set search_path = public
as $$
declare
  result public.app_config;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  insert into public.app_config (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid()
  returning * into result;
  return result;
end;
$$;

grant execute on function public.set_app_config(text, jsonb) to authenticated;

-- Single-key read, open to anon too: the login screen needs signup_gate
-- before a session exists, and every client needs maintenance_mode -- both
-- without granting broad read access to the whole config table.
create or replace function public.get_app_flag(p_key text)
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select value from public.app_config where key = p_key;
$$;

grant execute on function public.get_app_flag(text) to authenticated, anon;

-- ---- join-code rate limiting, now config-driven instead of hardcoded ----
-- Full replacement of 0047's version: same lockout mechanics, but max
-- attempts/lockout minutes read from app_config (falls back to the
-- original 5/15 defaults), plus the ban check.

create or replace function public.lookup_trip_by_join_code(p_code text)
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
  v_user_id uuid := auth.uid();
  v_attempts record;
  v_lockout_seconds int;
  v_max_attempts int;
  v_lockout_minutes int;
begin
  if v_user_id is null then
    raise exception 'Authentication required to join trips.';
  end if;

  if public.is_banned() then
    raise exception 'Your account has been suspended.';
  end if;

  select (value #>> '{}')::int into v_max_attempts from public.app_config where key = 'join_max_attempts';
  if v_max_attempts is null then v_max_attempts := 5; end if;

  select (value #>> '{}')::int into v_lockout_minutes from public.app_config where key = 'join_lockout_minutes';
  if v_lockout_minutes is null then v_lockout_minutes := 15; end if;

  select * into v_attempts from public.trip_join_attempts where user_id = v_user_id;

  if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
    v_lockout_seconds := ceil(extract(epoch from (v_attempts.locked_until - now())))::int;
    raise exception 'Too many invalid join code attempts. Please wait % seconds before trying again.', v_lockout_seconds;
  end if;

  select t.id into v_trip_id from public.trips t where t.join_code = upper(trim(p_code));

  if v_trip_id is null then
    insert into public.trip_join_attempts (user_id, failed_attempts, locked_until, last_attempt_at)
    values (v_user_id, 1, null, now())
    on conflict (user_id) do update set
      failed_attempts = case
        when trip_join_attempts.last_attempt_at < now() - interval '15 minutes' then 1
        else trip_join_attempts.failed_attempts + 1
      end,
      locked_until = case
        when trip_join_attempts.last_attempt_at < now() - interval '15 minutes' then null
        when trip_join_attempts.failed_attempts + 1 >= v_max_attempts then now() + (v_lockout_minutes || ' minutes')::interval
        else null
      end,
      last_attempt_at = now();

    select * into v_attempts from public.trip_join_attempts where user_id = v_user_id;
    if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
      v_lockout_seconds := ceil(extract(epoch from (v_attempts.locked_until - now())))::int;
      raise exception 'Too many invalid join code attempts. Maximum % attempts allowed. Please wait % seconds before trying again.', v_max_attempts, v_lockout_seconds;
    end if;

    return;
  end if;

  update public.trip_join_attempts
  set failed_attempts = 0, locked_until = null, last_attempt_at = now()
  where user_id = v_user_id;

  return query
    select
      t.id,
      t.name,
      (t.owner_id = v_user_id),
      (select m2.id from public.members m2 where m2.trip_id = t.id and m2.linked_user_id = v_user_id limit 1),
      m.id,
      m.name
    from public.trips t
    left join public.members m
      on m.trip_id = t.id and m.linked_user_id is null and m.archived = false
    where t.id = v_trip_id;
end;
$$;

grant execute on function public.lookup_trip_by_join_code(text) to authenticated;

-- ---- platform split analytics ----

drop policy if exists "superadmin can view all device tokens" on public.device_push_tokens;
create policy "superadmin can view all device tokens"
  on public.device_push_tokens for select
  to authenticated
  using (public.is_superadmin());

-- ---- fleet-wide broadcast notifications ----

create or replace function public.broadcast_notification(
  p_title text,
  p_body text,
  p_trip_id uuid default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;

  if p_trip_id is null then
    insert into public.notifications (user_id, trip_id, title, body, data)
    select id, null, p_title, p_body, jsonb_build_object('type', 'admin_broadcast')
    from public.profiles;
  else
    insert into public.notifications (user_id, trip_id, title, body, data)
    select distinct m.linked_user_id, p_trip_id, p_title, p_body, jsonb_build_object('type', 'admin_broadcast')
    from public.members m
    where m.trip_id = p_trip_id and m.linked_user_id is not null;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.broadcast_notification(text, text, uuid) to authenticated;

-- ---- manual recycle-bin purge (fleet-wide, on demand) ----

create or replace function public.purge_recycle_bin_older_than(p_days integer default 30)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  delete from public.expenses
  where deleted_at is not null
    and deleted_at < now() - (p_days || ' days')::interval;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.purge_recycle_bin_older_than(integer) to authenticated;

-- ---- recycle-bin auto-purge (0041's pg_cron job), now config-driven ----

create or replace function public.purge_expired_recycle_bin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours integer;
begin
  select (value #>> '{}')::int into v_hours from public.app_config where key = 'recycle_bin_retention_hours';
  if v_hours is null then
    v_hours := 24;
  end if;

  delete from public.expenses
  where deleted_at is not null
    and deleted_at < now() - (v_hours || ' hours')::interval;
end;
$$;

notify pgrst, 'reload schema';
