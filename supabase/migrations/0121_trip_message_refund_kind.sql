-- Migration 0121: Trip refunds in chat
-- Extends trip_messages.kind to officially allow 'refund_recorded'
alter table public.trip_messages
  drop constraint if exists trip_messages_kind_check;

alter table public.trip_messages
  add constraint trip_messages_kind_check
  check (kind in (
    'text',
    'expense_added',
    'refund_recorded',
    'settlement_recorded',
    'expense_disputed',
    'expense_dispute_resolved',
    'image',
    'expense_link',
    'voice_note',
    'expense_deleted',
    'expense_restored',
    'settlement_confirmed',
    'poll'
  ));
