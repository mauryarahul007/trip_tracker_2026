-- Migration 0120: Join a trip as a guest with just a name
--
-- Needs Supabase Auth -> Providers -> "Allow anonymous sign-ins" ON (dashboard setting, not SQL).
-- NOT APPLIED automatically: review, then run with scripts/apply-migration.mjs.
--
-- 1. handle_new_user: an anonymous sign-in has no email, but profiles.email is NOT NULL.
--    Give those profiles a unique placeholder address (never mailed: it ends in @guest.local).
-- 2. join_trip_with_name(code, name): the one way a guest gets into a trip. It checks the invite
--    code through the existing rate-limited lookup (5 bad codes = 15 minute lockout), reuses the
--    caller's member if they already joined, links an unclaimed member with the same name if there
--    is one, and otherwise adds a new member. Capped at 50 active members per trip.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_display_name text;
  v_email text;
begin
  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(split_part(new.email, '@', 1)), ''),
    'Traveler'
  );
  v_email := coalesce(new.email, 'guest-' || new.id::text || '@guest.local');

  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, v_email, v_display_name, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

create or replace function public.join_trip_with_name(p_code text, p_name text)
returns table (trip_id uuid, trip_name text, member_id uuid)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text := left(btrim(coalesce(p_name, '')), 100);
  v_trip_id uuid;
  v_trip_name text;
  v_member uuid;
begin
  if v_user is null then
    raise exception 'Authentication required to join trips.';
  end if;
  if length(v_name) = 0 then
    raise exception 'Please enter your name.';
  end if;

  -- Rate limiting and lockout live in the lookup (migration 0047/0060).
  perform 1 from public.lookup_trip_by_join_code(p_code);

  select t.id, t.name into v_trip_id, v_trip_name
  from public.trips t where t.join_code = upper(btrim(p_code));
  if v_trip_id is null then
    raise exception 'Invalid invite code.';
  end if;

  -- Already in this trip: just open it.
  select m.id into v_member from public.members m
  where m.trip_id = v_trip_id and m.linked_user_id = v_user limit 1;
  if v_member is not null then
    return query select v_trip_id, v_trip_name, v_member;
    return;
  end if;

  if (select count(*) from public.members m where m.trip_id = v_trip_id and not m.archived) >= 50 then
    raise exception 'This trip is full.';
  end if;

  -- Someone already added them by name: take that spot instead of making a duplicate.
  select m.id into v_member from public.members m
  where m.trip_id = v_trip_id and m.linked_user_id is null and not m.archived
    and lower(btrim(m.name)) = lower(v_name)
  order by m.created_at limit 1
  for update;

  if v_member is not null then
    update public.members set linked_user_id = v_user, updated_at = now() where id = v_member;
  else
    insert into public.members (trip_id, name, linked_user_id)
    values (v_trip_id, v_name, v_user)
    returning id into v_member;
  end if;

  return query select v_trip_id, v_trip_name, v_member;
end;
$$;

revoke all on function public.join_trip_with_name(text, text) from public, anon;
grant execute on function public.join_trip_with_name(text, text) to authenticated;

notify pgrst, 'reload schema';
