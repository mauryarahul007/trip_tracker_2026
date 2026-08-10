-- The original lookup_trip_by_join_code couldn't distinguish "invalid code"
-- from "valid code, everyone already claimed" (both returned zero rows via
-- the inner join), and didn't tell the caller whether they're already the
-- trip admin or have already claimed a member here. Replace it with a
-- version that always returns at least one row for a valid code (via LEFT
-- JOIN) and surfaces is_admin / my_member_id so the client can skip
-- straight to the trip instead of showing the picker again.
drop function if exists public.lookup_trip_by_join_code(text);

create function public.lookup_trip_by_join_code(p_code text)
returns table (
  trip_id uuid,
  trip_name text,
  is_admin boolean,
  my_member_id uuid,
  member_id uuid,
  member_name text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select t.id into v_trip_id from public.trips t where t.join_code = upper(p_code);

  if v_trip_id is null then
    return; -- empty result set = invalid code
  end if;

  return query
    select
      t.id,
      t.name,
      (t.owner_id = auth.uid()),
      (select m2.id from public.members m2 where m2.trip_id = t.id and m2.linked_user_id = auth.uid() limit 1),
      m.id,
      m.name
    from public.trips t
    left join public.members m
      on m.trip_id = t.id and m.linked_user_id is null and m.archived = false
    where t.id = v_trip_id;
end;
$$;

grant execute on function public.lookup_trip_by_join_code(text) to authenticated;
