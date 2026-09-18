-- Migration 0104: Add multi-payer support to expenses
-- Enables multiple members to front/pay for a single shared expense with exact contribution shares

alter table public.expenses
  add column if not exists paid_by_shares jsonb default null;

comment on column public.expenses.paid_by_shares is 'Map of member UUID to amount paid: {"<member_id>": number}. When null or empty, single payer paid_by applies.';

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
