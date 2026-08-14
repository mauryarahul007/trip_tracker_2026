-- Reverse-geocoded place names are a client-side display convenience and
-- must never be persisted server-side. Strip any placeName already stored
-- and document that the column is coordinates-only going forward.
update public.expenses
set location = jsonb_build_object('lat', location->'lat', 'lng', location->'lng')
where location ? 'placeName';

comment on column public.expenses.location is 'Optional GPS coordinates only: {"lat": float, "lng": float}. Place names are resolved client-side and never stored here.';
