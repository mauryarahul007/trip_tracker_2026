-- Migration 0102: One-way Google Calendar sync (enableCalendarSync).
-- Scoped to app -> Google Calendar push only (no incoming webhook, no
-- two-way sync) -- see decisions.md for why: a webhook receiver needs a
-- stable public endpoint plus 7-day renewal upkeep, real operational
-- surface for a feature that's mostly about getting passes onto a
-- traveler's phone calendar, not about reacting to their edits there.
--
-- Tokens are never exposed to the client directly (no grants on either
-- table at all -- RLS enabled with zero policies = default deny for both
-- anon and authenticated, service-role bypasses), same reasoning as
-- pending_digest_events (migration 0087). The client only ever sees a
-- connected/disconnected boolean via the RPCs below.
--
-- MANUAL SETUP REQUIRED (one-time, in the Google Cloud Console):
--   1. Create an OAuth 2.0 Client ID (Web application) with the Google
--      Calendar API enabled, scope https://www.googleapis.com/auth/calendar.events.
--   2. Authorized redirect URI: https://cdpdlzjwmffdtyzvbtpg.supabase.co/functions/v1/google-calendar-oauth-callback
--   3. supabase secrets set GOOGLE_CALENDAR_CLIENT_ID=... GOOGLE_CALENDAR_CLIENT_SECRET=...
--      on the google-calendar-oauth-start / -callback / push-calendar-event functions.
-- Until those secrets exist, google-calendar-oauth-start returns an error
-- the client surfaces as "Calendar sync isn't configured yet."

create table public.calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'google',
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_connections enable row level security;
revoke all on public.calendar_connections from anon, authenticated;

create table public.calendar_oauth_states (
  state uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.calendar_oauth_states enable row level security;
revoke all on public.calendar_oauth_states from anon, authenticated;

-- The only thing the client is ever allowed to know about its own
-- connection -- no tokens, just enough to render "Connected since ..." /
-- a Disconnect button.
create or replace function public.get_calendar_connection_status()
returns table (connected boolean, calendar_id text, connected_at timestamptz)
language sql
security definer set search_path = public
as $$
  select true, cc.calendar_id, cc.connected_at
  from public.calendar_connections cc
  where cc.user_id = auth.uid();
$$;

grant execute on function public.get_calendar_connection_status() to authenticated;

create or replace function public.disconnect_google_calendar()
returns void
language sql
security definer set search_path = public
as $$
  delete from public.calendar_connections where user_id = auth.uid();
$$;

grant execute on function public.disconnect_google_calendar() to authenticated;

-- 15-minute TTL sweep for abandoned OAuth flows (state minted but the
-- consent screen was never completed) -- same cadence pattern as
-- expire-location-shares (migration 0086).
create or replace function public.expire_stale_calendar_oauth_states()
returns void
language sql
security definer set search_path = public
as $$
  delete from public.calendar_oauth_states where created_at < now() - interval '15 minutes';
$$;

revoke all on function public.expire_stale_calendar_oauth_states() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-calendar-oauth-states';

select cron.schedule(
  'expire-calendar-oauth-states',
  '*/15 * * * *',
  $$select public.expire_stale_calendar_oauth_states()$$
);

notify pgrst, 'reload schema';
