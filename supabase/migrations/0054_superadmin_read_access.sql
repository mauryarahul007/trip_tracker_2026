-- 0057_superadmin_identity_and_rls.sql wired is_superadmin() into
-- is_trip_admin(), which every WRITE policy (members/groups/categories/
-- expenses insert-update-delete, trips update/delete) routes through --
-- but no READ policy routes through is_trip_admin(). Reads go through
-- is_trip_participant() instead (trips' own SELECT policy inlines the
-- same check rather than calling the function, per 0038's comment). Net
-- effect: a superadmin could freeze/archive/delete a trip in theory, but
-- could never SELECT any trip they don't personally own or belong to --
-- the Admin Portal rendered empty for every trip that wasn't the
-- superadmin's own.

create or replace function public.is_trip_participant(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_superadmin() or exists (
    select 1 from public.members m
    where m.trip_id = p_trip_id and m.linked_user_id = auth.uid()
  );
$$;

drop policy if exists "admins and participants can view their trip" on public.trips;
create policy "admins and participants can view their trip"
  on public.trips for select
  to authenticated
  using (
    public.is_superadmin()
    or owner_id = auth.uid()
    or exists (select 1 from public.members m where m.trip_id = trips.id and m.linked_user_id = auth.uid())
  );

notify pgrst, 'reload schema';
