-- Fix: "admin or original author can update expenses" (0018) blocks a
-- legitimate, already-shipped app workflow -- reviewing and fixing an
-- expense after a member is deleted from the trip.
--
-- The policy's WITH CHECK required a non-admin editor to remain the payer
-- or a split participant on the *new* row:
--   created_by_user_id = auth.uid()
--   and (paid_by = my_member_id(trip_id) or my_member_id(trip_id) = any(split_member_ids))
-- USING (which governs which existing rows can even be attempted) has no
-- such constraint -- it's just is_trip_admin(trip_id) or
-- created_by_user_id = auth.uid(). So a non-admin original author could
-- always *attempt* the update, but if the fix reassigns payer/split away
-- from themselves (a normal outcome of "reassign away from a departed
-- member"), Postgres silently updates 0 rows: error is null, no rows
-- touched. The app's optimistic UI showed it as fixed; the server never
-- actually got the write, and it reverted on the next refresh.
--
-- This does not weaken who can edit an expense -- USING already scoped
-- that to admins and the original author. It only drops the extra "and
-- you must still be a stakeholder afterward" constraint from WITH CHECK,
-- matching USING. paid_by/split_member_ids still have to reference real
-- members of this trip (existing FK/app-level validation), so this can't
-- be used to reassign an expense onto anyone outside the trip.

drop policy if exists "admin or original author can update expenses" on public.expenses;

create policy "admin or original author can update expenses"
  on public.expenses for update
  to authenticated
  using (
    public.is_trip_admin(trip_id) or created_by_user_id = auth.uid()
  )
  with check (
    public.is_trip_admin(trip_id) or created_by_user_id = auth.uid()
  );

notify pgrst, 'reload schema';
