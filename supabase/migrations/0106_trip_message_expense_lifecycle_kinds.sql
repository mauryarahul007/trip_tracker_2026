-- Migration 0106: In-chat cards for expense delete / restore / settlement confirm
-- Extends trip_messages.kind beyond add/dispute/media (0096).

alter table public.trip_messages
  drop constraint if exists trip_messages_kind_check;

alter table public.trip_messages
  add constraint trip_messages_kind_check
  check (kind in (
    'text',
    'expense_added',
    'settlement_recorded',
    'expense_disputed',
    'expense_dispute_resolved',
    'image',
    'expense_link',
    'voice_note',
    'expense_deleted',
    'expense_restored',
    'settlement_confirmed'
  ));

notify pgrst, 'reload schema';
