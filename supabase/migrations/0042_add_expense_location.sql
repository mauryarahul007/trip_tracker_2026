-- Add optional JSONB location column for GPS Geotagging
alter table public.expenses
  add column if not exists location jsonb null;

comment on column public.expenses.location is 'Optional GPS coordinates and reverse geocoded place name: {"lat": float, "lng": float, "placeName": string}';
