create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
)

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc)

alter table public.notifications enable row level security

-- Rows are written exclusively by the send-push edge function (service
-- role, already permission-checks that the caller shares a trip with
-- each recipient before fanning out) — clients only ever read/update
-- their own.
create policy "users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid())

create policy "users update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid())
