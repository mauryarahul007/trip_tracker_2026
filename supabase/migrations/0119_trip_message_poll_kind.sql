-- Migration 0119: Trip polls in chat
-- A poll is a trip_messages row with kind 'poll'. Its payload holds
--   { "question": text, "options": [{"id": text, "text": text}],
--     "votes": {"<optionId>": ["<memberId>", ...]}, "closed": bool }
-- Votes and closing update the payload; the existing "trip participants can
-- update reactions and pins" policy (0093) already lets any participant do that.
-- NOT APPLIED automatically: review, then run with scripts/apply-migration.mjs.

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
    'settlement_confirmed',
    'poll'
  ));

notify pgrst, 'reload schema';
