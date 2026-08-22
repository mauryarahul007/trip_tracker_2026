-- Fix is_trip_participant() to include is_trip_admin(p_trip_id).
-- When 0054 and 0060 rewrote is_trip_participant, it dropped the admin/owner check.
-- Consequently, when a trip owner inserts new members or reads trip entities
-- before their own member row is linked with auth.uid(), RLS SELECT checks
-- on public.members failed with "new row violates row-level security policy for table members".

create or replace function public.is_trip_participant(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select (not public.is_banned()) and (
    public.is_superadmin()
    or public.is_trip_admin(p_trip_id)
    or exists (
      select 1 from public.members m
      where m.trip_id = p_trip_id and m.linked_user_id = auth.uid()
    )
  );
$$;

notify pgrst, 'reload schema';
