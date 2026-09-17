-- Migration 0094: In-chat expense event cards (FEAT-C05)
-- Extends trip_messages with kind + payload so expense adds can appear as
-- structured cards in the chat timeline (flag-gated client-side).

alter table public.trip_messages
  add column if not exists kind text not null default 'text',
  add column if not exists payload jsonb;

alter table public.trip_messages
  drop constraint if exists trip_messages_kind_check;

alter table public.trip_messages
  add constraint trip_messages_kind_check
  check (kind in ('text', 'expense_added'));

comment on column public.trip_messages.kind is
  'Message type: text (default chat) or expense_added (structured expense card).';
comment on column public.trip_messages.payload is
  'Structured payload for non-text kinds, e.g. { expenseId, title, amount, currency }.';

notify pgrst, 'reload schema';
