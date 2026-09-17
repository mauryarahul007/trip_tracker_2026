-- Migration 0097: Trip-level chat read cursors (read receipts v1)
-- Cheaper than per-message read rows; UI shows peer cursor past a message.

create table if not exists public.trip_chat_read_cursors (
  trip_id uuid not null references public.trips (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  last_message_id uuid references public.trip_messages (id) on delete set null,
  primary key (trip_id, member_id)
);

create index if not exists trip_chat_read_cursors_trip_idx
  on public.trip_chat_read_cursors (trip_id);

alter table public.trip_chat_read_cursors enable row level security;

drop policy if exists "trip participants can view read cursors" on public.trip_chat_read_cursors;
create policy "trip participants can view read cursors"
  on public.trip_chat_read_cursors for select
  to authenticated
  using (public.is_trip_participant(trip_id));

drop policy if exists "members can upsert own read cursor" on public.trip_chat_read_cursors;
create policy "members can upsert own read cursor"
  on public.trip_chat_read_cursors for insert
  to authenticated
  with check (
    public.is_trip_participant(trip_id)
    and member_id = public.my_member_id(trip_id)
  );

drop policy if exists "members can update own read cursor" on public.trip_chat_read_cursors;
create policy "members can update own read cursor"
  on public.trip_chat_read_cursors for update
  to authenticated
  using (
    public.is_trip_participant(trip_id)
    and member_id = public.my_member_id(trip_id)
  )
  with check (
    public.is_trip_participant(trip_id)
    and member_id = public.my_member_id(trip_id)
  );

-- Realtime so peers see cursor advances without polling.
do $$
begin
  alter publication supabase_realtime add table public.trip_chat_read_cursors;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
