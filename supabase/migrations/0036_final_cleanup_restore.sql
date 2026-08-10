-- Stopping the diagnostic here — results stopped reproducing consistently
-- at this depth (removing the isolated "trigger" column did not revert
-- the failure), indicating platform-level non-determinism rather than a
-- deterministic schema trigger. Cleaning up every debug object and
-- restoring `trips` to its correct, intended final state.

drop table if exists public.members_clone cascade;
drop function if exists public.debug_trips_constraints() cascade;
drop function if exists public.is_self(uuid) cascade;

-- Remove the test rows created during this investigation.
delete from public.members where trip_id = 'f77dbaa9-113e-499b-98b3-65343331df9e';
delete from public.trips where id in (
  '61b230ca-92b8-49e4-8653-fe122be6e760', -- Raw SQL SET ROLE Test
  'f77dbaa9-113e-499b-98b3-65343331df9e'  -- RLS Disabled Test (+ its member)
);
delete from public.trips where name in (
  'Post Reload Test', 'Final Status Check', 'Function Wrapped Test',
  'No Unique Constraint Test', 'No FK No Unique Test', 'Select Wrapped UID Test'
);

-- Restore the real schema: RLS enabled, FK + unique constraint back,
-- correct policy.
alter table public.trips
  add constraint trips_owner_id_fkey foreign key (owner_id) references public.profiles (id) on delete cascade;
alter table public.trips
  add constraint trips_join_code_key unique (join_code);

alter table public.trips enable row level security;

drop policy if exists "creator becomes trip admin" on public.trips;
create policy "creator becomes trip admin"
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid());

notify pgrst, 'reload schema';
