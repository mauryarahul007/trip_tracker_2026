-- New tables aren't automatically part of the realtime publication —
-- without this, postgres_changes subscriptions connect successfully but
-- never actually receive INSERT events, silently degrading to
-- "only shows up after a manual refetch."
alter publication supabase_realtime add table public.notifications
