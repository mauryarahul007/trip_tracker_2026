-- Migration 0086: Live location share.
-- One row per (trip, user) -- the user's own current position, toggled on
-- for a bounded window rather than kept forever. Public read is via a
-- SECURITY DEFINER RPC keyed by a random uuid token (122 bits of entropy,
-- not brute-forceable the way the short join-code in migration 0081 is --
-- no lockout table needed here). Direct table access stays owner-only and
-- is never granted to anon; only the RPC can read across the token.

create table public.member_locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  share_token uuid not null default gen_random_uuid(),
  is_sharing boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index member_locations_share_token_idx on public.member_locations (share_token) where is_sharing;

alter table public.member_locations enable row level security;

revoke all on public.member_locations from anon;

create policy "owner can manage own live location"
  on public.member_locations for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_trip_participant(trip_id)
    and member_id = public.my_member_id(trip_id)
  );

create or replace function public.get_shared_location(p_token uuid)
returns table (
  member_name text,
  trip_name text,
  lat double precision,
  lng double precision,
  updated_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select m.name, t.name, ml.lat, ml.lng, ml.updated_at, ml.expires_at
    from public.member_locations ml
    join public.members m on m.id = ml.member_id
    join public.trips t on t.id = ml.trip_id
    where ml.share_token = p_token
      and ml.is_sharing = true
      and ml.expires_at > now();
end;
$$;

grant execute on function public.get_shared_location(uuid) to anon, authenticated;

-- Auto-expire: flips is_sharing off once expires_at passes, so a forgotten
-- share doesn't silently stay live forever. Same cron.schedule pattern as
-- purge-recycle-bin (migration 0041) / purge-audit-logs (migration 0062).
create or replace function public.expire_stale_location_shares()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.member_locations
  set is_sharing = false
  where is_sharing = true
    and expires_at is not null
    and expires_at < now();
end;
$$;

revoke all on function public.expire_stale_location_shares() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-location-shares';

select cron.schedule(
  'expire-location-shares',
  '*/15 * * * *',
  $$select public.expire_stale_location_shares()$$
);

notify pgrst, 'reload schema';
