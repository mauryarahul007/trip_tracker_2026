-- Migration 0093: WhatsApp Social Parity (Reactions, Quoted Replies, Pins) & Simplify Debts Toggle
-- Extends trip_messages with quoted replies, emoji reactions, and sticky pins.
-- Adds simplify_debts column to trips.

alter table public.trip_messages
  add column if not exists reply_to_id uuid references public.trip_messages(id) on delete set null,
  add column if not exists reactions jsonb not null default '{}'::jsonb,
  add column if not exists is_pinned boolean not null default false;

create index if not exists trip_messages_trip_pinned_idx
  on public.trip_messages (trip_id, is_pinned)
  where is_pinned = true;

-- Allow participants to update reactions and admins to update pin status
create policy "trip participants can update reactions and pins"
  on public.trip_messages for update
  to authenticated
  using (public.is_trip_participant(trip_id))
  with check (public.is_trip_participant(trip_id));

alter table public.trips
  add column if not exists simplify_debts boolean not null default true;

notify pgrst, 'reload schema';
