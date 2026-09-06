-- Migration 0077: Add itemized splits and member roles
-- Enables item-by-item receipt allocation with taxes/tips and multi-tier member roles (organizer/contributor/viewer)

-- 1. Update expenses split_mode check constraint to allow 'itemized'
alter table public.expenses
  drop constraint if exists expenses_split_mode_check;

alter table public.expenses
  add constraint expenses_split_mode_check
  check (split_mode in ('equal', 'equalUnit', 'custom', 'exact', 'percentage', 'itemized'));

-- 2. Add itemized_config column to expenses
alter table public.expenses
  add column if not exists itemized_config jsonb default null;

comment on column public.expenses.itemized_config is 'Itemized receipt breakdown: {items: [{id, name, amount, assignedMemberIds}], tax?: number, tip?: number, discount?: number}';

-- 3. Add member_roles column to trips
alter table public.trips
  add column if not exists member_roles jsonb not null default '{}'::jsonb;

comment on column public.trips.member_roles is 'Map of member UUID to role: {"<member_id>": "organizer" | "contributor" | "viewer"}';

-- 4. Reload PostgREST schema cache
notify pgrst, 'reload schema';
