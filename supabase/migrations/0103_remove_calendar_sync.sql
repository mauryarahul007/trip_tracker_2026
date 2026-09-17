-- Migration 0103: Remove Google Calendar sync (reverts migration 0102).
-- Feature deferred before any real user connected it -- no data loss.
-- Forward-only migration history: 0102 stays as a record of what shipped
-- and was then removed, rather than deleting/rewriting it.

select cron.unschedule(jobid) from cron.job where jobname = 'expire-calendar-oauth-states';

drop function if exists public.expire_stale_calendar_oauth_states();
drop function if exists public.disconnect_google_calendar();
drop function if exists public.get_calendar_connection_status();

drop table if exists public.calendar_oauth_states;
drop table if exists public.calendar_connections;

notify pgrst, 'reload schema';
