-- Migration 0108: growth telemetry, join-preview counter, lifecycle nudges.
-- Every write path here is gated server-side by a Superadmin Ops Deck flag
-- (feature_flag_overrides, migration 0064), mirrored in SQL because SQL has
-- no access to the TS DEFAULT_FEATURE_FLAGS constant:
--   enableGrowthTelemetry  (default OFF) -> app_events inserts, join previews counter
--   enableInviteConversion (default ON)  -> read publicly by the invite/share pages
--   enableLifecycleNudges  (default OFF) -> candidate selection for send-lifecycle-nudge
--
-- MANUAL SETUP REQUIRED for lifecycle nudges (same one-time step as 0087/0101):
--   select vault.create_secret('<a random 32+ char secret>', 'lifecycle_nudge_cron_secret');
-- Set the identical value as LIFECYCLE_NUDGE_CRON_SECRET on the send-lifecycle-nudge
-- edge function. Until set, trigger_lifecycle_nudges() no-ops with a notice.

-- ---------------------------------------------------------------------------
-- Flag helpers (global override only; per-trip override handled where needed)
-- ---------------------------------------------------------------------------
create or replace function public.growth_telemetry_on()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select ffo.value from public.feature_flag_overrides ffo
      where ffo.scope = 'global' and ffo.scope_id = '' and ffo.flag_key = 'enableGrowthTelemetry'),
    false
  );
$$;

revoke all on function public.growth_telemetry_on() from public;
grant execute on function public.growth_telemetry_on() to authenticated;

-- Anonymous invite/share pages cannot call get_resolved_feature_flags
-- (authenticated only), so expose exactly the two flags they need.
create or replace function public.get_public_growth_flags()
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select jsonb_build_object(
    'enableInviteConversion', coalesce(
      (select ffo.value from public.feature_flag_overrides ffo
        where ffo.scope = 'global' and ffo.scope_id = '' and ffo.flag_key = 'enableInviteConversion'),
      true
    ),
    'enableGrowthTelemetry', public.growth_telemetry_on()
  );
$$;

grant execute on function public.get_public_growth_flags() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- app_events: one row per event, insert-only from clients, read only through
-- the superadmin RPCs below. No expense content, member names or search text.
-- ---------------------------------------------------------------------------
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  event text not null check (event in ('app_open', 'sync_fail', 'queue_stuck', 'flush_ok')),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) < 512),
  day date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now()
);

create index if not exists app_events_event_created_idx on public.app_events (event, created_at);
create index if not exists app_events_user_day_idx on public.app_events (user_id, day);
-- One app_open per user per UTC day; clients ignore the 23505 on repeat opens.
create unique index if not exists app_events_one_open_per_day
  on public.app_events (user_id, day) where event = 'app_open';

alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;
grant insert on public.app_events to authenticated;

drop policy if exists "users insert own events while telemetry is on" on public.app_events;
create policy "users insert own events while telemetry is on"
  on public.app_events for insert
  to authenticated
  with check (user_id = auth.uid() and public.growth_telemetry_on());

select cron.unschedule(jobid) from cron.job where jobname = 'purge-app-events';
select cron.schedule(
  'purge-app-events',
  '15 3 * * 0',
  $$delete from public.app_events where created_at < now() - interval '180 days'$$
);

-- ---------------------------------------------------------------------------
-- Superadmin aggregates
-- ---------------------------------------------------------------------------
-- Cohorts start at the first app_open ever recorded, so users who signed up
-- before the flag was armed do not show up as false churn. "Retained" means
-- the user opened the app on or after day N of their signup.
create or replace function public.admin_retention_cohorts(p_weeks int default 8)
returns table (
  cohort_week date,
  cohort_size int,
  d1_eligible int, d1_retained int,
  d7_eligible int, d7_retained int,
  d30_eligible int, d30_retained int
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;

  return query
  with t0 as (select min(created_at) as at from public.app_events where event = 'app_open'),
  cohort as (
    select p.id, p.created_at::date as d, date_trunc('week', p.created_at)::date as wk
    from public.profiles p, t0
    where t0.at is not null
      and p.created_at >= t0.at
      and p.created_at >= now() - make_interval(weeks => p_weeks)
  ),
  last_open as (
    select e.user_id, max(e.day) as last_day
    from public.app_events e where e.event = 'app_open' group by e.user_id
  )
  select
    c.wk,
    count(*)::int,
    count(*) filter (where current_date - c.d >= 1)::int,
    count(*) filter (where current_date - c.d >= 1 and l.last_day - c.d >= 1)::int,
    count(*) filter (where current_date - c.d >= 7)::int,
    count(*) filter (where current_date - c.d >= 7 and l.last_day - c.d >= 7)::int,
    count(*) filter (where current_date - c.d >= 30)::int,
    count(*) filter (where current_date - c.d >= 30 and l.last_day - c.d >= 30)::int
  from cohort c
  left join last_open l on l.user_id = c.id
  group by c.wk
  order by c.wk desc;
end;
$$;

grant execute on function public.admin_retention_cohorts(int) to authenticated;

-- Trip 1 -> trip 2: of organizers whose first trip is 30+ days old, how many
-- created another. Works on historical data, no telemetry needed.
create or replace function public.admin_repeat_creator_rate()
returns table (creators_eligible int, repeat_creators int)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;

  return query
  with per_owner as (
    select owner_id, min(created_at) as first_at, count(*) as n from public.trips group by owner_id
  )
  select
    (count(*) filter (where first_at <= now() - interval '30 days'))::int,
    (count(*) filter (where first_at <= now() - interval '30 days' and n >= 2))::int
  from per_owner;
end;
$$;

grant execute on function public.admin_repeat_creator_rate() to authenticated;

create or replace function public.admin_reliability_summary(p_days int default 14)
returns table (platform text, app_version text, event text, events bigint, users bigint)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;

  return query
  select
    coalesce(e.props->>'platform', 'unknown'),
    coalesce(e.props->>'appVersion', 'unknown'),
    e.event,
    count(*)::bigint,
    count(distinct e.user_id)::bigint
  from public.app_events e
  where e.created_at > now() - make_interval(days => p_days)
  group by 1, 2, 3
  order by 2 desc, 1, 3;
end;
$$;

grant execute on function public.admin_reliability_summary(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Join-preview counter (anonymous invite visitors). Always returns void so it
-- cannot be used to test whether a code exists.
-- ---------------------------------------------------------------------------
alter table public.trips
  add column if not exists join_preview_count integer not null default 0;

create or replace function public.record_join_preview(p_code text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.growth_telemetry_on() then
    return;
  end if;
  update public.trips
  set join_preview_count = join_preview_count + 1
  where join_code = upper(trim(coalesce(p_code, '')));
end;
$$;

grant execute on function public.record_join_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lifecycle nudges
-- ---------------------------------------------------------------------------
create table if not exists public.lifecycle_nudge_log (
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null check (kind in ('invite', 'packing', 'next_trip')),
  user_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (trip_id, kind)
);

create index if not exists lifecycle_nudge_log_user_sent_idx on public.lifecycle_nudge_log (user_id, sent_at);

alter table public.lifecycle_nudge_log enable row level security;
revoke all on public.lifecycle_nudge_log from anon, authenticated;

-- ponytail: date windows are exact (start_date = today + 2, end_date = today - 30),
-- so a missed cron day skips that nudge. Widen to a range if cron reliability matters.
create or replace function public.get_lifecycle_nudge_candidates()
returns table (trip_id uuid, trip_name text, kind text, user_id uuid, join_code text)
language sql
security definer set search_path = public
as $$
  with flagged as (
    select t.*
    from public.trips t
    where t.archived = false
      and coalesce(
        (select ffo.value from public.feature_flag_overrides ffo where ffo.scope = 'trip' and ffo.scope_id = t.id::text and ffo.flag_key = 'enableLifecycleNudges'),
        (select ffo.value from public.feature_flag_overrides ffo where ffo.scope = 'global' and ffo.scope_id = '' and ffo.flag_key = 'enableLifecycleNudges'),
        false
      ) = true
  ),
  cand as (
    select f.id as trip_id, f.name as trip_name, 'invite'::text as kind, f.owner_id as user_id, f.join_code
    from flagged f
    where f.created_at < now() - interval '24 hours'
      and f.created_at > now() - interval '14 days'
      and not exists (select 1 from public.expenses e where e.trip_id = f.id and e.deleted_at is null)
      and not exists (select 1 from public.members m where m.trip_id = f.id and m.linked_user_id is not null and m.linked_user_id <> f.owner_id)
    union all
    select f.id, f.name, 'packing', f.owner_id, f.join_code
    from flagged f
    where f.start_date = current_date + 2 and jsonb_array_length(f.checklist) = 0
    union all
    select f.id, f.name, 'next_trip', f.owner_id, f.join_code
    from flagged f
    where f.frozen = true and f.end_date = current_date - 30
  )
  select c.trip_id, c.trip_name, c.kind, c.user_id, c.join_code
  from cand c
  where not exists (select 1 from public.lifecycle_nudge_log l where l.trip_id = c.trip_id and l.kind = c.kind)
    and not exists (select 1 from public.lifecycle_nudge_log l where l.user_id = c.user_id and l.sent_at > now() - interval '3 days');
$$;

revoke all on function public.get_lifecycle_nudge_candidates() from public, anon, authenticated;

create or replace function public.log_lifecycle_nudge_sent(p_trip_id uuid, p_kind text, p_user_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.lifecycle_nudge_log (trip_id, kind, user_id) values (p_trip_id, p_kind, p_user_id)
  on conflict (trip_id, kind) do nothing;
$$;

revoke all on function public.log_lifecycle_nudge_sent(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.trigger_lifecycle_nudges()
returns void
language plpgsql
security definer set search_path = public, extensions, vault
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'lifecycle_nudge_cron_secret'
  limit 1;

  if v_secret is null then
    raise notice 'lifecycle_nudge_cron_secret not set in Vault yet -- skipping lifecycle nudge run (see migration 0108 header for setup)';
    return;
  end if;

  perform net.http_post(
    url := 'https://cdpdlzjwmffdtyzvbtpg.supabase.co/functions/v1/send-lifecycle-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-lifecycle-nudge-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_lifecycle_nudges() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'send-lifecycle-nudges';

-- 12:30 UTC = 18:00 IST, an evening push for the primary (India) audience.
select cron.schedule(
  'send-lifecycle-nudges',
  '30 12 * * *',
  $$select public.trigger_lifecycle_nudges()$$
);

notify pgrst, 'reload schema';
