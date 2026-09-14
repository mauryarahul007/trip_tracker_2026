-- Migration 0085: Dispute flag on expenses.
-- Any trip participant can flag an expense ("something looks wrong here");
-- only the flagger or a trip admin can resolve it. Same shape as migration
-- 0083's edit_trip_message: a SECURITY DEFINER RPC is the only path allowed
-- to touch these columns, so the permission rule is enforced server-side,
-- not just hidden client-side. Direct UPDATE (used by the existing
-- edit/settle flow) is tightened so it can't touch these columns either.

alter table public.expenses
  add column disputed_at timestamptz,
  add column disputed_by_user_id uuid references auth.users(id) on delete set null,
  add column dispute_note text;

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
  );

create or replace function public.flag_expense_dispute(p_expense_id uuid, p_note text default null)
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
  if not public.is_trip_participant(exp.trip_id) then
    raise exception 'not a participant of this trip';
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'note too long';
  end if;

  update public.expenses
  set disputed_at = now(), disputed_by_user_id = auth.uid(), dispute_note = p_note
  where id = p_expense_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.resolve_expense_dispute(p_expense_id uuid)
returns public.expenses
language plpgsql
security definer set search_path = public
as $$
declare
  exp public.expenses;
  result public.expenses;
begin
  select * into exp from public.expenses where id = p_expense_id;
  if not found then
    raise exception 'expense not found';
  end if;
  if exp.disputed_at is null then
    raise exception 'expense is not flagged';
  end if;
  if not (
    public.is_trip_admin(exp.trip_id) or exp.disputed_by_user_id = auth.uid()
  ) then
    raise exception 'not allowed to resolve this dispute';
  end if;

  update public.expenses
  set disputed_at = null, disputed_by_user_id = null, dispute_note = null
  where id = p_expense_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.flag_expense_dispute(uuid, text) to authenticated;
grant execute on function public.resolve_expense_dispute(uuid) to authenticated;

notify pgrst, 'reload schema';
