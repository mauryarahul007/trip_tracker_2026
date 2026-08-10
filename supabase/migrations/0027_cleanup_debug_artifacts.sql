-- Investigation complete — isolated to a platform-level anomaly (INSERT
-- into any NOT NULL column fails RLS for anon/authenticated regardless of
-- policy content; service_role and SELECT are unaffected). Cleaning up
-- every diagnostic object and restoring the real schema to its intended
-- state (the owner_id FK was dropped in 0019 purely for testing).

drop table if exists public.trips_clone cascade;
drop table if exists public.trips_clone2 cascade;
drop table if exists public.trips_clone3 cascade;
drop table if exists public.trips_clone4 cascade;
drop table if exists public.trips_clone5 cascade;

alter table public.trips
  add constraint trips_owner_id_fkey foreign key (owner_id) references public.profiles (id) on delete cascade;

notify pgrst, 'reload schema';
