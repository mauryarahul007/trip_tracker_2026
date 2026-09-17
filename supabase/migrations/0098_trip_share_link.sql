-- Migration 0098: Read-only trip share link.
-- One revocable uuid token per trip (122 bits of entropy -- same
-- unguessable-token reasoning as member_locations.share_token in migration
-- 0086, so no IP-lockout table is needed here either). Generate/revoke go
-- through the trip's existing owner-only "only admin can update trip"
-- policy (direct UPDATE, no new RPC needed for that half). The anon read
-- is a SECURITY DEFINER RPC returning a deliberately bounded summary --
-- no member list, no individual balances, no raw expense rows -- so a
-- forwarded link can't be used to snoop on who owes what.

alter table public.trips
  add column share_token uuid,
  add column share_enabled boolean not null default false,
  add column share_expires_at timestamptz;

create unique index trips_share_token_idx on public.trips (share_token) where share_enabled;

create or replace function public.get_trip_share(p_token uuid)
returns table (
  trip_name text,
  start_date date,
  end_date date,
  destination text,
  member_count bigint,
  expense_count bigint,
  spend_by_currency jsonb
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select t.id into v_trip_id
  from public.trips t
  where t.share_token = p_token
    and t.share_enabled = true
    and (t.share_expires_at is null or t.share_expires_at > now());

  if v_trip_id is null then
    return;
  end if;

  return query
    select
      t.name,
      t.start_date,
      t.end_date,
      t.destination,
      (select count(*) from public.members m where m.trip_id = t.id and m.archived = false),
      (select count(*) from public.expenses e where e.trip_id = t.id and e.deleted_at is null and e.is_settlement = false),
      (
        select coalesce(jsonb_object_agg(e.currency, e.total), '{}'::jsonb)
        from (
          select currency, sum(amount) as total
          from public.expenses
          where trip_id = t.id and deleted_at is null and is_settlement = false
          group by currency
        ) e
      )
    from public.trips t
    where t.id = v_trip_id;
end;
$$;

grant execute on function public.get_trip_share(uuid) to anon, authenticated;

-- Same 15-minute sweep cadence as expire-location-shares (migration 0086):
-- flips share_enabled off once share_expires_at passes so a forgotten link
-- doesn't stay live forever.
create or replace function public.expire_stale_trip_shares()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.trips
  set share_enabled = false
  where share_enabled = true
    and share_expires_at is not null
    and share_expires_at < now();
end;
$$;

revoke all on function public.expire_stale_trip_shares() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-trip-shares';

select cron.schedule(
  'expire-trip-shares',
  '*/15 * * * *',
  $$select public.expire_stale_trip_shares()$$
);

notify pgrst, 'reload schema';
