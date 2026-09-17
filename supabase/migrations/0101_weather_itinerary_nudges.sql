-- Migration 0101: Weather-triggered itinerary nudges.
-- Same cron -> secret-authenticated edge function shape as digest
-- notifications (migration 0087): a daily pg_cron job pokes
-- send-weather-nudge, which resolves which trips have the flag active
-- (via feature_flag_overrides, migration 0064 -- trip override wins over
-- global override wins over the hardcoded false default, mirrored here
-- since SQL has no access to the TS DEFAULT_FEATURE_FLAGS constant) and
-- pushes a nudge when tomorrow's forecast looks bad for an upcoming stop.
--
-- MANUAL SETUP REQUIRED (same one-time step as migration 0087):
--   select vault.create_secret('<a random 32+ char secret>', 'weather_nudge_cron_secret');
-- Set the identical value as the WEATHER_NUDGE_CRON_SECRET env var on the
-- send-weather-nudge edge function. Until set, trigger_weather_nudges()
-- no-ops (raises a notice) -- the cron job still runs on schedule.

-- Dedupes so a trip is nudged at most once per calendar date, even if the
-- forecast is re-checked (e.g. a manual re-run).
create table public.weather_nudge_log (
  trip_id uuid not null references public.trips(id) on delete cascade,
  nudge_date date not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, nudge_date)
);

alter table public.weather_nudge_log enable row level security;
revoke all on public.weather_nudge_log from anon, authenticated;

-- Returns only what the edge function needs: trip id/name, participant
-- user ids, and the best-available lat/lng to check (first stop with
-- coordinates, else null -- the edge function falls back to geocoding
-- `destination` text itself when this is null).
create or replace function public.get_weather_nudge_candidate_trips()
returns table (
  trip_id uuid,
  trip_name text,
  destination text,
  stop_lat double precision,
  stop_lng double precision,
  participant_user_ids uuid[]
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select
      t.id,
      t.name,
      t.destination,
      (
        select (s->>'lat')::double precision
        from jsonb_array_elements(coalesce(t.stops, '[]'::jsonb)) s
        where s->>'lat' is not null
        limit 1
      ),
      (
        select (s->>'lng')::double precision
        from jsonb_array_elements(coalesce(t.stops, '[]'::jsonb)) s
        where s->>'lng' is not null
        limit 1
      ),
      coalesce(
        array_agg(m.linked_user_id) filter (where m.linked_user_id is not null and m.archived = false),
        '{}'::uuid[]
      )
    from public.trips t
    left join public.members m on m.trip_id = t.id
    where t.archived = false
      and t.end_date >= current_date
      and coalesce(
        (select ffo.value from public.feature_flag_overrides ffo where ffo.scope = 'trip' and ffo.scope_id = t.id::text and ffo.flag_key = 'enableWeatherItineraryNudges'),
        (select ffo.value from public.feature_flag_overrides ffo where ffo.scope = 'global' and ffo.scope_id = '' and ffo.flag_key = 'enableWeatherItineraryNudges'),
        false
      ) = true
      and not exists (
        select 1 from public.weather_nudge_log wnl where wnl.trip_id = t.id and wnl.nudge_date = current_date
      )
    group by t.id, t.name, t.destination, t.stops;
end;
$$;

revoke all on function public.get_weather_nudge_candidate_trips() from public, anon, authenticated;

create or replace function public.log_weather_nudge_sent(p_trip_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.weather_nudge_log (trip_id, nudge_date) values (p_trip_id, current_date)
  on conflict (trip_id, nudge_date) do nothing;
$$;

revoke all on function public.log_weather_nudge_sent(uuid) from public, anon, authenticated;

create or replace function public.trigger_weather_nudges()
returns void
language plpgsql
security definer set search_path = public, extensions, vault
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'weather_nudge_cron_secret'
  limit 1;

  if v_secret is null then
    raise notice 'weather_nudge_cron_secret not set in Vault yet -- skipping weather nudge run (see migration 0101 header for setup)';
    return;
  end if;

  perform net.http_post(
    url := 'https://cdpdlzjwmffdtyzvbtpg.supabase.co/functions/v1/send-weather-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-weather-nudge-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_weather_nudges() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'send-weather-nudges';

-- 6pm UTC daily -- evening-before nudge for "tomorrow looks rainy", same
-- fixed-time-for-everyone simplification as the digest cron (0087).
select cron.schedule(
  'send-weather-nudges',
  '0 18 * * *',
  $$select public.trigger_weather_nudges()$$
);

notify pgrst, 'reload schema';
