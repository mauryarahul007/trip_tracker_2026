alter table public.trips
  add column archived boolean not null default false;
