-- Members other than the trip owner could not persist packing, notes, or
-- passes: those live as JSON on trips, and "only admin can update trip"
-- rejects every other participant. The client swallowed the error, so the
-- change stayed on one phone.
--
-- set_trip_collab_field lets any participant write only those collaborative
-- columns. A tiny signal row (not a notification) tells other open clients
-- to refetch. Triggers on the shared tables cover expenses, members, and
-- groups too, so those tabs update without a reload.

create table if not exists public.trip_collab_signals (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.trip_collab_signals enable row level security;

drop policy if exists "participants can read collab signals" on public.trip_collab_signals;
create policy "participants can read collab signals"
  on public.trip_collab_signals for select
  to authenticated
  using (public.is_trip_participant(trip_id));

grant select on public.trip_collab_signals to authenticated;

create or replace function public.touch_trip_collab()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  -- The trip row is going away; cascade removes the signal. Other clients
  -- learn about deletion from the existing trip_deleted notification.
  if tg_table_name = 'trips' and tg_op = 'DELETE' then
    return null;
  end if;

  if tg_table_name = 'trips' then
    tid := new.id;
  elsif tg_table_name = 'group_members' then
    select g.trip_id into tid
    from public.groups g
    where g.id = case when tg_op = 'DELETE' then old.group_id else new.group_id end;
  else
    tid := case when tg_op = 'DELETE' then old.trip_id else new.trip_id end;
  end if;

  if tid is null then
    return null;
  end if;

  insert into public.trip_collab_signals as s (trip_id, revision, updated_at)
  values (tid, 1, now())
  on conflict (trip_id) do update
    set revision = s.revision + 1,
        updated_at = now();

  return null;
end;
$$;

-- The session that fires the trigger must be allowed to call this function.
-- The body is security definer, so it can write the signal row without an
-- insert policy for authenticated.
revoke all on function public.touch_trip_collab() from public, anon;
grant execute on function public.touch_trip_collab() to authenticated;

drop trigger if exists trips_touch_collab on public.trips;
create trigger trips_touch_collab
  after insert or update or delete on public.trips
  for each row execute function public.touch_trip_collab();

drop trigger if exists members_touch_collab on public.members;
create trigger members_touch_collab
  after insert or update or delete on public.members
  for each row execute function public.touch_trip_collab();

drop trigger if exists groups_touch_collab on public.groups;
create trigger groups_touch_collab
  after insert or update or delete on public.groups
  for each row execute function public.touch_trip_collab();

drop trigger if exists group_members_touch_collab on public.group_members;
create trigger group_members_touch_collab
  after insert or update or delete on public.group_members
  for each row execute function public.touch_trip_collab();

drop trigger if exists expenses_touch_collab on public.expenses;
create trigger expenses_touch_collab
  after insert or update or delete on public.expenses
  for each row execute function public.touch_trip_collab();

drop trigger if exists categories_touch_collab on public.categories;
create trigger categories_touch_collab
  after insert or update or delete on public.categories
  for each row execute function public.touch_trip_collab();

create or replace function public.set_trip_collab_field(p_trip_id uuid, p_field text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_participant(p_trip_id) then
    raise exception 'not a participant of this trip';
  end if;
  if p_field not in ('checklist', 'notes', 'passes', 'fx_config') then
    raise exception 'field not allowed';
  end if;
  if p_value is null then
    raise exception 'value is required';
  end if;
  if p_field = 'fx_config' then
    if jsonb_typeof(p_value) <> 'object' then
      raise exception 'fx_config must be a json object';
    end if;
  elsif jsonb_typeof(p_value) <> 'array' then
    raise exception 'value must be a json array';
  end if;
  if octet_length(p_value::text) > 750000 then
    raise exception 'value is too large';
  end if;

  execute format('update public.trips set %I = $1, updated_at = now() where id = $2', p_field)
  using p_value, p_trip_id;
end;
$$;

revoke all on function public.set_trip_collab_field(uuid, text, jsonb) from public, anon;
grant execute on function public.set_trip_collab_field(uuid, text, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_collab_signals'
  ) then
    alter publication supabase_realtime add table public.trip_collab_signals;
  end if;
end $$;

notify pgrst, 'reload schema';
