-- Trips created before the "auto-add creator as member" feature (commit
-- 1eaff55) never got a member row linked to the owner, so the creator
-- never shows the Admin badge in the members list. Backfill: for every
-- trip whose owner has no linked member yet, add one.
insert into public.members (trip_id, name, linked_user_id)
select
  t.id,
  coalesce(nullif(p.display_name, ''), split_part(p.email, '@', 1), 'Admin'),
  t.owner_id
from public.trips t
join public.profiles p on p.id = t.owner_id
where not exists (
  select 1 from public.members m
  where m.trip_id = t.id and m.linked_user_id = t.owner_id
);
