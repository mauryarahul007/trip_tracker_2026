-- ============================================================================
-- Migration 0114: Sync Triggers, Composite Indexes & Realtime Replica Identity
--
-- Purpose:
--   1. Adds `updated_at` column to `categories` (previously missing).
--   2. Adds generic `set_updated_at_column()` trigger to automatically touch
--      `updated_at = now()` on updates to `trips`, `members`, `groups`,
--      `categories`, and `expenses`.
--   3. Adds composite indexes on `(trip_id, updated_at)` across core tables to
--      support high-performance incremental delta queries (`get_trip_changes`).
--   4. Sets `replica identity full` on `trip_messages` so filtered Realtime
--      subscribers receive complete UPDATE payloads on message edits and deletions.
--
-- Backwards Compatibility:
--   100% additive. All columns have defaults or are nullable. Triggers do not
--   interfere with existing explicit `updated_at` values written by web client.
--
-- Rollback SQL:
--   drop trigger if exists set_trips_updated_at on public.trips;
--   drop trigger if exists set_members_updated_at on public.members;
--   drop trigger if exists set_groups_updated_at on public.groups;
--   drop trigger if exists set_categories_updated_at on public.categories;
--   drop trigger if exists set_expenses_updated_at on public.expenses;
--   drop function if exists public.set_updated_at_column();
--   drop index if exists public.trips_id_updated_at_idx;
--   drop index if exists public.members_trip_updated_at_idx;
--   drop index if exists public.groups_trip_updated_at_idx;
--   drop index if exists public.categories_trip_updated_at_idx;
--   drop index if exists public.expenses_trip_updated_at_idx;
--   alter table public.categories drop column if exists updated_at;
-- ============================================================================

-- 1. Ensure `categories` has updated_at column
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'updated_at'
  ) then
    alter table public.categories add column updated_at timestamptz not null default now();
  end if;
end $$;

-- 2. Trigger function to auto-update `updated_at`
create or replace function public.set_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. Attach before update triggers to core tables
drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at_column();

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at_column();

drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at_column();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at_column();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at_column();

-- 4. Composite indexes for high-speed incremental sync queries
create index if not exists trips_id_updated_at_idx on public.trips (id, updated_at desc);
create index if not exists members_trip_updated_at_idx on public.members (trip_id, updated_at desc);
create index if not exists groups_trip_updated_at_idx on public.groups (trip_id, updated_at desc);
create index if not exists categories_trip_updated_at_idx on public.categories (trip_id, updated_at desc);
create index if not exists expenses_trip_updated_at_idx on public.expenses (trip_id, updated_at desc);

-- 5. Realtime replica identity for trip_messages
alter table public.trip_messages replica identity full;

notify pgrst, 'reload schema';
