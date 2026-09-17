-- Migration 0095: More in-chat event card kinds (settlement + disputes)
-- Extends trip_messages.kind beyond expense_added (0094).

alter table public.trip_messages
  drop constraint if exists trip_messages_kind_check;

alter table public.trip_messages
  add constraint trip_messages_kind_check
  check (kind in (
    'text',
    'expense_added',
    'settlement_recorded',
    'expense_disputed',
    'expense_dispute_resolved'
  ));

notify pgrst, 'reload schema';
