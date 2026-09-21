-- Growth / CX attribution for Superadmin Ops Deck.
-- Closeout pulse, Splitwise import counts, share-link views, signup UTM.
-- All columns are nullable/defaulted so older clients keep working.

alter table public.trips
  add column if not exists closeout_pulse text,
  add column if not exists closeout_pulse_at timestamptz,
  add column if not exists splitwise_imported_at timestamptz,
  add column if not exists splitwise_import_count integer,
  add column if not exists share_view_count integer not null default 0;

alter table public.trips
  drop constraint if exists trips_closeout_pulse_check;

alter table public.trips
  add constraint trips_closeout_pulse_check
  check (closeout_pulse is null or closeout_pulse in ('yes', 'no', 'skip'));

alter table public.profiles
  add column if not exists signup_source jsonb;

-- Public share page may increment views without auth. Same token gate as get_trip_share.
create or replace function public.record_trip_share_view(p_token uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.trips
  set share_view_count = coalesce(share_view_count, 0) + 1
  where share_token = p_token
    and share_enabled = true
    and (share_expires_at is null or share_expires_at > now())
  returning share_view_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.record_trip_share_view(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
