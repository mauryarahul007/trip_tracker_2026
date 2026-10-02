-- Packing, notes, and passes should arrive like a chat message: the
-- trips UPDATE itself is the event, and the new JSON is the payload.
-- trip_collab_signals (0109) still tells clients to refetch members and
-- expenses. Replica identity full is what lets a filtered UPDATE include
-- those columns, same requirement chat relies on for trip_messages.

alter table public.trips replica identity full;
alter table public.trip_collab_signals replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end $$;
