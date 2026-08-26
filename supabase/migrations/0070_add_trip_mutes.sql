-- Per-user, per-trip push-notification mute. Muting only suppresses the
-- FCM push (send-push checks this table before sending); the in-app
-- notifications panel row is still written, so muted activity stays
-- visible if the user opens the app -- it just stops pinging their phone.
create table public.trip_mutes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

alter table public.trip_mutes enable row level security;

create policy "users manage their own trip mutes"
  on public.trip_mutes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
