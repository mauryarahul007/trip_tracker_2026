-- ============================================================================
-- Migration 0084: Extra expense photos
-- ============================================================================
-- Lets a saved expense carry more than one photo (beyond the single OCR
-- receipt). Reuses the existing 'receipts' storage bucket and its RLS
-- policies unchanged -- extra photos are stored at
-- {tripId}/{expenseId}-{suffix}.jpg, so the first path segment is still the
-- trip id that public.is_trip_participant() already checks.

alter table public.expenses
  add column if not exists photo_paths text[] not null default '{}';

notify pgrst, 'reload schema';
