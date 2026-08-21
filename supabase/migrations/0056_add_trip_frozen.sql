alter table public.trips
  add column frozen boolean not null default false;
