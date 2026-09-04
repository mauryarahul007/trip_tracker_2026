-- Migration 0076: Add collaborative checklist and notes to trips
-- Enables shared packing lists, tasks, and travel notes (Wi-Fi, PNRs, cab info)
-- Inherits existing is_trip_participant RLS policy automatically.

alter table public.trips
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists notes jsonb not null default '[]'::jsonb;

comment on column public.trips.checklist is 'Collaborative checklist items: [{id, text, completed, category?, assignedToMemberId?, completedByMemberId?, createdAt, updatedAt}, ...]';
comment on column public.trips.notes is 'Collaborative travel scratchpad: [{id, title, content, colorTag?, pinned?, createdAt, updatedAt}, ...]';

notify pgrst, 'reload schema';
