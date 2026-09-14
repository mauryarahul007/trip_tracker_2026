-- Migration 0089: Trip participants can see active live-location shares
-- in-app, not just whoever holds the public /live/:token link. Migration
-- 0086's RLS was owner-only (a user could only ever read their own row);
-- this adds a second SELECT policy widening reads to "any trip participant,
-- for shares that are currently active" -- writes stay owner-only.

create policy "trip participants can view active shares"
  on public.member_locations for select
  to authenticated
  using (
    is_sharing = true
    and public.is_trip_participant(trip_id)
  );

notify pgrst, 'reload schema';
