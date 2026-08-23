-- Bug: the route-planner/ambient-backdrop feature (TripBannerRouteMap,
-- AmbientPhotoBackdrop, passport-card stop chips) reads trip.destination
-- and trip.stops, and tripApi.insertTrip/updateTripRow already accept both
-- as parameters -- but neither column ever existed on trips, so both
-- fields were silently dropped from every insert/update. Data lived only
-- in optimistic client state until the next refetch wiped it.
alter table public.trips
  add column if not exists destination text,
  add column if not exists stops jsonb not null default '[]'::jsonb;

comment on column public.trips.destination is 'Human-readable route summary, e.g. "Manali → Kasol → Tosh".';
comment on column public.trips.stops is 'Ordered list of route waypoints: [{id, name, lat?, lng?}, ...].';

notify pgrst, 'reload schema';
