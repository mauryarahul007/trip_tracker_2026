-- Phase 11.4: cutover observability. READ-ONLY queries. Run by hand in the Supabase SQL editor
-- (as postgres/service role) or wrap in your own views. Nothing here is applied by migrations.
--
-- Segmenting by client
--   app_events.props has: platform ('ios'|'android'|'web'), appVersion, and (Flutter only) client = 'flutter'.
--   Capacitor and web do not send `client`, so: platform web -> 'web'; ios/android without client -> 'capacitor'.
--   device_push_tokens.client is 'capacitor' | 'flutter' | 'web' (migration 0111).
--   bugs.environment.client is 'flutter' for Flutter reports; web/Capacitor use environment.platform.
-- Telemetry (app_events) only exists while the Ops Deck flag enableGrowthTelemetry is ON (default OFF).
-- Turn it on BEFORE the first beta or sections 1-3 are empty.

-- helper expression used below (copy-paste): client of an event row
--   coalesce(e.props->>'client', case when e.props->>'platform' = 'web' then 'web' else 'capacitor' end)

-- ---------------------------------------------------------------------------
-- 1. DAU by client (last 14 days). One app_open per user per UTC day by design.
-- ---------------------------------------------------------------------------
select e.day,
       coalesce(e.props->>'client', case when e.props->>'platform' = 'web' then 'web' else 'capacitor' end) as client,
       count(*) as dau
from public.app_events e
where e.event = 'app_open' and e.day > (now() at time zone 'utc')::date - 14
group by 1, 2
order by 1 desc, 2;

-- ---------------------------------------------------------------------------
-- 2. Sync failure rate by client: users with a sync_fail that day / users who opened the app.
--    (Events are once per session, so this is a user-day rate, not a request rate.)
-- ---------------------------------------------------------------------------
with ev as (
  select e.day, e.user_id, e.event,
         coalesce(e.props->>'client', case when e.props->>'platform' = 'web' then 'web' else 'capacitor' end) as client
  from public.app_events e
  where e.day > (now() at time zone 'utc')::date - 14
)
select day, client,
       count(distinct user_id) filter (where event = 'app_open') as active_users,
       count(distinct user_id) filter (where event = 'sync_fail') as users_with_sync_fail,
       round(100.0 * count(distinct user_id) filter (where event = 'sync_fail')
             / nullif(count(distinct user_id) filter (where event = 'app_open'), 0), 2) as sync_fail_pct
from ev
group by 1, 2
order by 1 desc, 2;

-- ---------------------------------------------------------------------------
-- 3. Stuck queues (10+ minutes online with work waiting): users and share of active users.
-- ---------------------------------------------------------------------------
with ev as (
  select e.day, e.user_id, e.event,
         coalesce(e.props->>'client', case when e.props->>'platform' = 'web' then 'web' else 'capacitor' end) as client
  from public.app_events e
  where e.day > (now() at time zone 'utc')::date - 14
)
select day, client,
       count(distinct user_id) filter (where event = 'queue_stuck') as stuck_users,
       count(distinct user_id) filter (where event = 'app_open')    as active_users
from ev
group by 1, 2
order by 1 desc, 2;

-- ---------------------------------------------------------------------------
-- 4. Existing superadmin RPCs (use as-is, Ops Deck already calls them):
--      select * from public.admin_reliability_summary(14);   -- platform x appVersion x event
--      select * from public.admin_retention_cohorts(8);
--      select * from public.get_notification_stats();        -- total / read / last 7 days (no delivery data)
--    They require is_superadmin(); run them from the Ops Deck or as a superadmin session, not as service role.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5. Push health. There is NO delivery log: send-push only logs. What we can see is token supply.
-- ---------------------------------------------------------------------------
select coalesce(client, 'unknown') as client, platform,
       count(*)                                                       as tokens,
       count(*) filter (where last_seen_at > now() - interval '7 days')  as seen_7d,
       count(*) filter (where last_seen_at < now() - interval '30 days') as stale_30d,
       count(distinct user_id)                                        as users
from public.device_push_tokens
group by 1, 2
order by 1, 2;

-- Users who have BOTH a capacitor and a flutter token (dual-install during migration):
select user_id
from public.device_push_tokens
where client in ('capacitor', 'flutter')
group by user_id
having count(distinct client) = 2;

-- ---------------------------------------------------------------------------
-- 6. Crashes by client (auto-filed bugs). Crash-free is APPROXIMATE: crash cases per DAU.
--    Flutter sets environment.client = 'flutter'; older reports only have environment.platform.
--    public.bugs has NO user_id column (migrations 0055/0059), so users affected cannot be counted;
--    the Flutter report puts a one-way hash of the user in diagnostics->>'user' (not for counting people, only for support).
-- ---------------------------------------------------------------------------
select date_trunc('day', created_at)::date as day,
       coalesce(environment->>'client', case when environment->>'platform' = 'web' then 'web' else 'capacitor' end) as client,
       count(*)                   as crash_cases,
       count(distinct fingerprint) as distinct_crashes
from public.bugs
where found_by = 'auto-crash-handler' and created_at > now() - interval '14 days'
group by 1, 2
order by 1 desc, 2;

-- ---------------------------------------------------------------------------
-- 7. Signups by client / source (first-touch attribution, migration 0113).
-- ---------------------------------------------------------------------------
select date_trunc('day', created_at)::date as day,
       coalesce(signup_source->>'utm_source', '(none)') as source,
       count(*) as signups
from public.profiles
where created_at > now() - interval '14 days'
group by 1, 2
order by 1 desc, 3 desc;

-- ---------------------------------------------------------------------------
-- 8. Join-code abuse signals (migration 0047 lockout table).
-- ---------------------------------------------------------------------------
select count(*) filter (where locked_until > now()) as locked_now,
       count(*) filter (where last_attempt_at > now() - interval '1 hour') as attempts_users_1h,
       max(failed_attempts) as worst_failed_attempts
from public.trip_join_attempts;

-- ---------------------------------------------------------------------------
-- NOT answerable from SQL (use the Supabase dashboard or logs):
--   * p95 API latency      -> Reports > API (response time), Logs Explorer for edge functions
--   * auth failure rate    -> Logs Explorer, Auth logs (failed password / token errors)
--   * push delivery rate   -> Edge function logs of send-push (FCM response codes)
--   * outbox quarantine    -> not an event yet (see ALERTS.md section 5)
-- ---------------------------------------------------------------------------
