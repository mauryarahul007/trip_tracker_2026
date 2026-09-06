-- Migration 0078: Add travel passes and multi-currency fx config to trips
-- Enables digital wallet boarding passes/vouchers and custom currency exchange rate locks

-- 1. Add passes column to trips
alter table public.trips
  add column if not exists passes jsonb not null default '[]'::jsonb,
  add column if not exists fx_config jsonb default null;

comment on column public.trips.passes is 'Digital travel passes (flights, trains, hotel vouchers, event tickets): [{id, type, title, provider?, referenceCode?, startDateTime?, origin?, destination?, seatOrRoom?, address?, notes?, qrData?, assignedMemberIds?}, ...]';
comment on column public.trips.fx_config is 'Trip exchange rate overrides & forex markup: {customRates?: Record<string, number>, markupPercent?: number}';

-- 2. Reload PostgREST schema cache
notify pgrst, 'reload schema';
