-- ============================================================================
-- Migration 0047: Security Hardening Phase 2 (Join Code Rate Limiting & Bot Cooldown)
-- ============================================================================

-- 1. Create table to track failed join code attempts per user
create table if not exists public.trip_join_attempts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

create index if not exists trip_join_attempts_locked_idx on public.trip_join_attempts (user_id, locked_until);

alter table public.trip_join_attempts enable row level security;

-- Completely isolate the tracking table from direct client access
revoke all on public.trip_join_attempts from anon, authenticated;

-- 2. Enhanced lookup_trip_by_join_code with rate limiting and automated bot lockout
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
begin
  if v_user_id is null then
    raise exception 'Authentication required to join trips.';
  end if;

  -- 1. Check existing lockout status for this user
  select * into v_attempts from public.trip_join_attempts where user_id = v_user_id;

  if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
    v_lockout_seconds := ceil(extract(epoch from (v_attempts.locked_until - now())))::int;
    raise exception 'Too many invalid join code attempts. Please wait % seconds before trying again.', v_lockout_seconds;
  end if;

  -- 2. Lookup trip by uppercase code
  select t.id into v_trip_id from public.trips t where t.join_code = upper(trim(p_code));

  if v_trip_id is null then
    -- Failed attempt: update tracker
    insert into public.trip_join_attempts (user_id, failed_attempts, locked_until, last_attempt_at)
    values (
      v_user_id,
      1,
      null,
      now()
    )
    on conflict (user_id) do update set
      -- If previous failure was > 15 minutes ago, reset counter; otherwise increment
      failed_attempts = case
        when trip_join_attempts.last_attempt_at < now() - interval '15 minutes' then 1
        else trip_join_attempts.failed_attempts + 1
      end,
      locked_until = case
        when trip_join_attempts.last_attempt_at < now() - interval '15 minutes' then null
        when trip_join_attempts.failed_attempts + 1 >= 5 then now() + interval '15 minutes'
        else null
      end,
      last_attempt_at = now();

    -- Check if this failure triggered a lockout
    select * into v_attempts from public.trip_join_attempts where user_id = v_user_id;
    if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
      v_lockout_seconds := ceil(extract(epoch from (v_attempts.locked_until - now())))::int;
      raise exception 'Too many invalid join code attempts. Maximum 5 attempts allowed. Please wait % seconds before trying again.', v_lockout_seconds;
    end if;

    return; -- returns empty result set for invalid code without lockout
  end if;

  -- 3. Success: Reset failed attempts on valid code
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

notify pgrst, 'reload schema';
