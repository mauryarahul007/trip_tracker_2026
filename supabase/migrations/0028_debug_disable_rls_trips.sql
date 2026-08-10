-- Temporary: disable RLS entirely on trips to see if that (as opposed to
-- merely relaxing the policy content) changes the outcome.
alter table public.trips disable row level security;
