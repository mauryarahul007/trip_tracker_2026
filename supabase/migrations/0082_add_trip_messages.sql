-- Migration 0082: Trip Chat -- lightweight WhatsApp-style group chat per trip
-- Own table (not JSONB on trips) since chat is append-only and would otherwise
-- fight the whole-array-rewrite + conflict-resolver pattern used by checklist/notes.

create table public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  member_id uuid not null references public.members (id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index trip_messages_trip_id_created_idx on public.trip_messages (trip_id, created_at desc);

alter table public.trip_messages enable row level security;

create policy "trip participants can view messages"
  on public.trip_messages for select
  to authenticated
  using (public.is_trip_participant(trip_id));

create policy "trip participants can send messages"
  on public.trip_messages for insert
  to authenticated
  with check (
    public.is_trip_participant(trip_id)
    and member_id = public.my_member_id(trip_id)
  );

-- Soft-delete only: author or trip admin can set deleted_at, no hard delete, no body edits.
create policy "author or admin can soft-delete messages"
  on public.trip_messages for update
  to authenticated
  using (
    public.is_trip_admin(trip_id) or member_id = public.my_member_id(trip_id)
  )
  with check (
    public.is_trip_admin(trip_id) or member_id = public.my_member_id(trip_id)
  );

alter publication supabase_realtime add table public.trip_messages;

notify pgrst, 'reload schema';
