-- Migration 0100: Big-expense mutual approval.
-- A per-trip threshold (in the trip's base currency); a new expense at or
-- above it is inserted as approval_status = 'pending_approval' instead of
-- 'confirmed'. Client-side balance/settlement/analytics calculations
-- (settlement.ts, App.tsx) already exclude pending_approval rows -- this
-- migration only adds the columns, the approve RPC, and the RLS guard that
-- makes the pending state authoritative even against a malicious client
-- (a direct UPDATE can't self-approve; only approve_expense can flip it,
-- same SECURITY DEFINER RPC shape as confirm_settlement in migration 0099).

alter table public.trips
  add column approval_threshold numeric;

alter table public.expenses
  add column approval_status text not null default 'confirmed' check (approval_status in ('confirmed', 'pending_approval')),
  add column approved_by_user_id uuid references auth.users(id) on delete set null;

drop policy "admin or original author can update expenses" on public.expenses;

create policy "admin or original author can update expenses"
  on public.expenses for update
  to authenticated
  using (
    public.is_trip_admin(trip_id) or created_by_user_id = auth.uid()
  )
  with check (
    (
      public.is_trip_admin(trip_id)
      or (
        created_by_user_id = auth.uid()
        and (paid_by = public.my_member_id(trip_id) or public.my_member_id(trip_id) = any (split_member_ids))
      )
    )
    and disputed_at is not distinct from (select e.disputed_at from public.expenses e where e.id = expenses.id)
    and disputed_by_user_id is not distinct from (select e.disputed_by_user_id from public.expenses e where e.id = expenses.id)
    and dispute_note is not distinct from (select e.dispute_note from public.expenses e where e.id = expenses.id)
    and settlement_confirmed_at is not distinct from (select e.settlement_confirmed_at from public.expenses e where e.id = expenses.id)
    and settlement_confirmed_by_user_id is not distinct from (select e.settlement_confirmed_by_user_id from public.expenses e where e.id = expenses.id)
    and approval_status is not distinct from (select e.approval_status from public.expenses e where e.id = expenses.id)
    and approved_by_user_id is not distinct from (select e.approved_by_user_id from public.expenses e where e.id = expenses.id)
  );

create or replace function public.approve_expense(p_expense_id uuid)
returns public.expenses
language plpgsql
security definer set search_path = public
as $$
declare
  exp public.expenses;
  result public.expenses;
begin
  select * into exp from public.expenses where id = p_expense_id and deleted_at is null;
  if not found then
    raise exception 'expense not found';
  end if;
  if exp.approval_status <> 'pending_approval' then
    raise exception 'expense is not pending approval';
  end if;
  if not public.is_trip_participant(exp.trip_id) then
    raise exception 'not a participant of this trip';
  end if;
  -- The expense's own creator can't be the second approver -- that would
  -- make the whole feature a no-op self-approval.
  if exp.created_by_user_id = auth.uid() then
    raise exception 'the expense creator cannot approve their own pending expense';
  end if;

  update public.expenses
  set approval_status = 'confirmed', approved_by_user_id = auth.uid()
  where id = p_expense_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.approve_expense(uuid) to authenticated;

notify pgrst, 'reload schema';
