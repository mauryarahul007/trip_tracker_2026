-- Migration 0099: Two-sided settlement confirmation.
-- A settlement is just an expenses row with is_settlement = true (paid_by =
-- debtor, split_member_ids[0] = creditor -- see settlement.ts). Today it's
-- trusted the moment the payer records it. This adds a recipient-only
-- confirm step, same shape as flag_expense_dispute/resolve_expense_dispute
-- in migration 0085: a SECURITY DEFINER RPC is the only path allowed to
-- touch these columns, direct UPDATE is tightened so it can't.

alter table public.expenses
  add column settlement_confirmed_at timestamptz,
  add column settlement_confirmed_by_user_id uuid references auth.users(id) on delete set null;

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
  );

create or replace function public.confirm_settlement(p_expense_id uuid)
returns public.expenses
language plpgsql
security definer set search_path = public
as $$
declare
  exp public.expenses;
  result public.expenses;
  v_creditor_member_id uuid;
begin
  select * into exp from public.expenses where id = p_expense_id and deleted_at is null;
  if not found then
    raise exception 'expense not found';
  end if;
  if not exp.is_settlement then
    raise exception 'not a settlement entry';
  end if;
  if exp.settlement_confirmed_at is not null then
    raise exception 'already confirmed';
  end if;

  v_creditor_member_id := exp.split_member_ids[1];
  if v_creditor_member_id is null or v_creditor_member_id <> public.my_member_id(exp.trip_id) then
    raise exception 'only the settlement recipient can confirm it';
  end if;

  update public.expenses
  set settlement_confirmed_at = now(), settlement_confirmed_by_user_id = auth.uid()
  where id = p_expense_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.confirm_settlement(uuid) to authenticated;

notify pgrst, 'reload schema';
