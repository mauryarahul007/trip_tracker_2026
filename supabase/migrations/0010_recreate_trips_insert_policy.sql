-- Every diagnostic (auth.uid(), current_role, the boolean expression
-- itself) proves owner_id = auth.uid() evaluates true in the exact
-- request context, yet the INSERT is rejected. Dropping and recreating
-- the policy fresh to rule out stale catalog/plan state.
drop policy if exists "creator becomes trip admin" on public.trips;

create policy "creator becomes trip admin"
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid());
