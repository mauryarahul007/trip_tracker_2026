-- Migration 0092: Quiet hours (FeatureFlagKey: enableQuietHours).
-- Per-user time window during which push notifications are suppressed --
-- distinct from trip_mutes (all-or-nothing per trip): this is time-windowed
-- and applies across every trip. The in-app notifications panel row is
-- still written either way (same as trip_mutes / digest mode), only the
-- FCM push itself is held back.
create table public.quiet_hours_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  -- Stored as "HH:MM" in the user's own local time, captured client-side
  -- at save time -- avoids the edge function having to guess a timezone.
  start_time text not null default '22:00',
  end_time text not null default '07:00',
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

alter table public.quiet_hours_prefs enable row level security;

create policy "owner can manage own quiet hours preference"
  on public.quiet_hours_prefs for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
