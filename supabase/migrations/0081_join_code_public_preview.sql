-- ============================================================================
-- Migration 0081: Public join-code preview (name, dates, member first names)
-- Invited friends can see a trip exists before Google login. Does NOT expose
-- trip id, member ids, expenses, or balances. Claim still requires auth
-- (lookup_trip_by_join_code + claim_trip_member stay authenticated-only).
-- Failed-code lockout is keyed by hashed client IP so anon guessing is
-- rate-limited the same way signed-in lookups are.
-- ============================================================================

create table if not exists public.trip_join_preview_attempts (
  client_key text primary key,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

alter table public.trip_join_preview_attempts enable row level security;

revoke all on public.trip_join_preview_attempts from anon, authenticated;

create or replace function public.preview_trip_by_join_code(p_code text)
returns table (
  trip_name text,
  start_date date,
  end_date date,
  member_first_names text[]
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_client_key text;
  v_attempts record;
  v_lockout_seconds int;
  v_max_attempts int;
  v_lockout_minutes int;
begin
  if p_code is null or btrim(p_code) = '' then
    return;
  end if;

  begin
    v_headers := coalesce(current_setting('request.headers', true)::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  if v_ip is null then
    v_ip := nullif(v_headers->>'cf-connecting-ip', '');
  end if;
  if v_ip is null then
    v_ip := coalesce(host(inet_client_addr()), 'unknown');
  end if;
  v_client_key := md5(v_ip);

  select (value #>> '{}')::int into v_max_attempts from public.app_config where key = 'join_max_attempts';
  if v_max_attempts is null then v_max_attempts := 5; end if;

  select (value #>> '{}')::int into v_lockout_minutes from public.app_config where key = 'join_lockout_minutes';
  if v_lockout_minutes is null then v_lockout_minutes := 15; end if;

  select * into v_attempts from public.trip_join_preview_attempts where client_key = v_client_key;

  if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
    v_lockout_seconds := ceil(extract(epoch from (v_attempts.locked_until - now())))::int;
    raise exception 'Too many invalid join code attempts. Please wait % seconds before trying again.', v_lockout_seconds;
  end if;

  select t.id into v_trip_id from public.trips t where t.join_code = upper(trim(p_code));

  if v_trip_id is null then
    insert into public.trip_join_preview_attempts (client_key, failed_attempts, locked_until, last_attempt_at)
    values (v_client_key, 1, null, now())
    on conflict (client_key) do update set
      failed_attempts = case
        when trip_join_preview_attempts.last_attempt_at < now() - interval '15 minutes' then 1
        else trip_join_preview_attempts.failed_attempts + 1
      end,
      locked_until = case
        when trip_join_preview_attempts.last_attempt_at < now() - interval '15 minutes' then null
        when trip_join_preview_attempts.failed_attempts + 1 >= v_max_attempts then now() + (v_lockout_minutes || ' minutes')::interval
        else null
      end,
      last_attempt_at = now();

    select * into v_attempts from public.trip_join_preview_attempts where client_key = v_client_key;
    if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
      v_lockout_seconds := ceil(extract(epoch from (v_attempts.locked_until - now())))::int;
      raise exception 'Too many invalid join code attempts. Maximum % attempts allowed. Please wait % seconds before trying again.', v_max_attempts, v_lockout_seconds;
    end if;

    return;
  end if;

  update public.trip_join_preview_attempts
  set failed_attempts = 0, locked_until = null, last_attempt_at = now()
  where client_key = v_client_key;

  return query
    select
      t.name,
      t.start_date,
      t.end_date,
      coalesce(
        array_agg(split_part(btrim(m.name), ' ', 1) order by m.created_at, m.name)
          filter (where m.id is not null and m.archived = false and btrim(m.name) <> ''),
        '{}'::text[]
      )
    from public.trips t
    left join public.members m on m.trip_id = t.id
    where t.id = v_trip_id
    group by t.id, t.name, t.start_date, t.end_date;
end;
$$;

grant execute on function public.preview_trip_by_join_code(text) to anon, authenticated;

notify pgrst, 'reload schema';
