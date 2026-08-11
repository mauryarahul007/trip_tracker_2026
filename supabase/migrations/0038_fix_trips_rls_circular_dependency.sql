-- Fix circular dependency and re-enable RLS on trips table.
-- Converts SQL-language helper functions to PL/pgSQL to prevent
-- the PostgreSQL query planner from inlining them. Inlining caused
-- them to run in the caller's RLS context, leading to infinite recursion.
-- Under PL/pgSQL, they execute as security definer (bypassing RLS internally),
-- which correctly isolates row verification and lets trips insert/select succeed.

create or replace function public.is_trip_admin(p_trip_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.owner_id = auth.uid()
  );
end;
$$;

create or replace function public.is_trip_participant(p_trip_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
begin
  return public.is_trip_admin(p_trip_id) or exists (
    select 1 from public.members m
    where m.trip_id = p_trip_id and m.linked_user_id = auth.uid()
  );
end;
$$;

create or replace function public.my_member_id(p_trip_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
stable
as $$
begin
  return (
    select m.id from public.members m
    where m.trip_id = p_trip_id and m.linked_user_id = auth.uid()
    limit 1
  );
end;
$$;

-- Re-enable Row Level Security on the trips table
alter table public.trips enable row level security;

-- Notify PostgREST to reload the schema
notify pgrst, 'reload schema';
