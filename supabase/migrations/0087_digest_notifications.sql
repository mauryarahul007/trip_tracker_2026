-- Migration 0087: Digest-mode notifications.
-- Per-user opt-in: instead of an immediate push per event, events queue up
-- in pending_digest_events and a daily pg_cron job pokes the send-digest
-- edge function, which compiles one push per user and clears the queue.
--
-- MANUAL SETUP REQUIRED (not committed to git -- do this once via the
-- Supabase SQL editor after this migration lands):
--   select vault.create_secret('<a random 32+ char secret>', 'digest_cron_secret');
-- Set the identical value as the DIGEST_CRON_SECRET env var on the
-- send-digest edge function (supabase secrets set DIGEST_CRON_SECRET=...).
-- Until that secret exists, trigger_notification_digest() below no-ops
-- (raises a notice, does not call out) -- the cron job runs on schedule
-- either way, it just has nothing to authenticate with yet.

create extension if not exists pg_net with schema extensions;

create table public.notification_digest_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_digest_prefs enable row level security;

create policy "owner can manage own digest preference"
  on public.notification_digest_prefs for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Never exposed to the client directly -- only send-push (inserting, via
-- its existing service-role client) and send-digest (reading/deleting,
-- same) ever touch this table. RLS enabled with zero policies = default
-- deny for both anon and authenticated; service-role bypasses RLS entirely.
create table public.pending_digest_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  trip_name text,
  type text not null,
  params jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.pending_digest_events enable row level security;

create index pending_digest_events_user_id_idx on public.pending_digest_events (user_id);

create or replace function public.trigger_notification_digest()
returns void
language plpgsql
security definer set search_path = public, extensions, vault
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'digest_cron_secret'
  limit 1;

  if v_secret is null then
    raise notice 'digest_cron_secret not set in Vault yet -- skipping digest send (see migration 0087 header for setup)';
    return;
  end if;

  perform net.http_post(
    url := 'https://cdpdlzjwmffdtyzvbtpg.supabase.co/functions/v1/send-digest',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_notification_digest() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'send-notification-digests';

-- 8am UTC daily -- one fixed time for every user for now; per-user
-- timezone-aware scheduling is a reasonable follow-up, not built here.
select cron.schedule(
  'send-notification-digests',
  '0 8 * * *',
  $$select public.trigger_notification_digest()$$
);

notify pgrst, 'reload schema';
