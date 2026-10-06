-- ============================================================================
-- Migration 0115: Sync Idempotency RPCs, Replay Hardening & Incremental Read
--
-- Purpose:
--   1. Implements `public.upsert_expense_v1` RPC: an atomic, replay-safe
--      idempotent upsert mechanism using client-generated UUIDs with RLS checks.
--   2. Hardens non-idempotent state transition RPCs (`confirm_settlement`,
--      `approve_expense`, `resolve_expense_dispute`, `claim_trip_member`)
--      to return successful idempotent results on replayed execution instead
--      of throwing exceptions.
--   3. Implements `public.get_trip_changes(p_trip_id, p_since)` RPC returning
--      all mutated entities and deleted expense tombstones in a single atomic
--      round-trip with high-water mark timestamping.
--
-- Backwards Compatibility:
--   100% additive. Existing direct INSERT / UPDATE PostgREST paths used by
--   the web app continue functioning unmodified. Hardened RPCs maintain
--   exact same argument types and return schemas while making retries safe.
--
-- Rollback SQL:
--   drop function if exists public.upsert_expense_v1;
--   drop function if exists public.get_trip_changes(uuid, timestamptz);
--   -- Original RPC versions can be re-applied from 0018, 0085, 0099, 0100.
-- ============================================================================

-- 1. Idempotent Expense Upsert RPC
create or replace function public.upsert_expense_v1(
  p_id uuid,
  p_trip_id uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_category text,
  p_date date,
  p_paid_by uuid,
  p_split_mode text,
  p_split_member_ids uuid[],
  p_split_config jsonb default null,
  p_resolved_shares jsonb default '{}'::jsonb,
  p_receipt_path text default null,
  p_paid_by_shares jsonb default null,
  p_itemized_config jsonb default null,
  p_location jsonb default null,
  p_approval_status text default 'confirmed'
)
returns public.expenses
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller_id uuid := auth.uid();
  v_existing public.expenses;
  v_result public.expenses;
  v_is_settlement boolean;
begin
  if v_caller_id is null then
    raise exception 'unauthenticated';
  end if;

  if not public.is_trip_participant(p_trip_id) then
    raise exception 'not a participant of this trip';
  end if;

  v_is_settlement := (p_title like 'Settlement:%');

  select * into v_existing from public.expenses where id = p_id;

  if found then
    -- Check permissions for update: must be trip admin or original creator
    if not (public.is_trip_admin(p_trip_id) or v_existing.created_by_user_id = v_caller_id) then
      raise exception 'not authorized to update this expense';
    end if;

    update public.expenses
    set
      title = p_title,
      amount = p_amount,
      currency = p_currency,
      category = p_category,
      date = p_date,
      paid_by = p_paid_by,
      split_mode = p_split_mode,
      split_member_ids = p_split_member_ids,
      split_config = p_split_config,
      resolved_shares = p_resolved_shares,
      receipt_path = coalesce(p_receipt_path, v_existing.receipt_path),
      paid_by_shares = p_paid_by_shares,
      itemized_config = p_itemized_config,
      location = p_location,
      approval_status = coalesce(p_approval_status, v_existing.approval_status),
      updated_at = now()
    where id = p_id
    returning * into v_result;

    return v_result;
  else
    insert into public.expenses (
      id,
      trip_id,
      title,
      amount,
      currency,
      category,
      date,
      paid_by,
      split_mode,
      split_member_ids,
      split_config,
      resolved_shares,
      receipt_path,
      paid_by_shares,
      itemized_config,
      location,
      is_settlement,
      approval_status,
      created_by_user_id,
      created_at,
      updated_at
    ) values (
      p_id,
      p_trip_id,
      p_title,
      p_amount,
      p_currency,
      p_category,
      p_date,
      p_paid_by,
      p_split_mode,
      p_split_member_ids,
      p_split_config,
      p_resolved_shares,
      p_receipt_path,
      p_paid_by_shares,
      p_itemized_config,
      p_location,
      v_is_settlement,
      coalesce(p_approval_status, 'confirmed'),
      v_caller_id,
      now(),
      now()
    )
    returning * into v_result;

    return v_result;
  end if;
end;
$$;

grant execute on function public.upsert_expense_v1 to authenticated;

-- 2. Idempotent confirm_settlement
create or replace function public.confirm_settlement(p_expense_id uuid)
returns public.expenses
language plpgsql
security definer set search_path = public, auth
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

  -- Idempotency guard: if already confirmed, return current record safely
  if exp.settlement_confirmed_at is not null then
    return exp;
  end if;

  v_creditor_member_id := exp.split_member_ids[1];
  if v_creditor_member_id is null or v_creditor_member_id <> public.my_member_id(exp.trip_id) then
    raise exception 'only the settlement recipient can confirm it';
  end if;

  update public.expenses
  set settlement_confirmed_at = now(), settlement_confirmed_by_user_id = auth.uid(), updated_at = now()
  where id = p_expense_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.confirm_settlement(uuid) to authenticated;

-- 3. Idempotent approve_expense
create or replace function public.approve_expense(p_expense_id uuid)
returns public.expenses
language plpgsql
security definer set search_path = public, auth
as $$
declare
  exp public.expenses;
  result public.expenses;
begin
  select * into exp from public.expenses where id = p_expense_id and deleted_at is null;
  if not found then
    raise exception 'expense not found';
  end if;

  -- Idempotency guard: if already confirmed, return current record safely
  if exp.approval_status = 'confirmed' then
    return exp;
  end if;

  if not public.is_trip_participant(exp.trip_id) then
    raise exception 'not a participant of this trip';
  end if;

  if exp.created_by_user_id = auth.uid() then
    raise exception 'the expense creator cannot approve their own pending expense';
  end if;

  update public.expenses
  set approval_status = 'confirmed', approved_by_user_id = auth.uid(), updated_at = now()
  where id = p_expense_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.approve_expense(uuid) to authenticated;

-- 4. Idempotent resolve_expense_dispute
create or replace function public.resolve_expense_dispute(p_expense_id uuid)
returns public.expenses
language plpgsql
security definer set search_path = public, auth
as $$
declare
  exp public.expenses;
  result public.expenses;
begin
  select * into exp from public.expenses where id = p_expense_id;
  if not found then
    raise exception 'expense not found';
  end if;

  -- Idempotency guard: if already unflagged, return current record safely
  if exp.disputed_at is null then
    return exp;
  end if;

  if not (public.is_trip_admin(exp.trip_id) or exp.disputed_by_user_id = auth.uid()) then
    raise exception 'not allowed to resolve this dispute';
  end if;

  update public.expenses
  set disputed_at = null, disputed_by_user_id = null, dispute_note = null, updated_at = now()
  where id = p_expense_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.resolve_expense_dispute(uuid) to authenticated;

-- 5. Idempotent claim_trip_member
create or replace function public.claim_trip_member(p_member_id uuid)
returns boolean
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Idempotency guard: if already claimed by THIS user, return true
  if exists (
    select 1 from public.members
    where id = p_member_id and linked_user_id = auth.uid()
  ) then
    return true;
  end if;

  update public.members
  set linked_user_id = auth.uid(), updated_at = now()
  where id = p_member_id
    and linked_user_id is null;

  get diagnostics v_updated = row_count;
  return (v_updated = 1);
end;
$$;

grant execute on function public.claim_trip_member(uuid) to authenticated;

-- 6. Incremental Delta Query RPC (get_trip_changes)
create or replace function public.get_trip_changes(
  p_trip_id uuid,
  p_since timestamptz default '-infinity'::timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_since timestamptz := coalesce(p_since, '-infinity'::timestamptz);
  v_server_time timestamptz := clock_timestamp();
  v_trip jsonb;
  v_members jsonb;
  v_groups jsonb;
  v_group_members jsonb;
  v_categories jsonb;
  v_expenses jsonb;
  v_tombstone_expenses jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if not public.is_trip_participant(p_trip_id) then
    raise exception 'not a participant of this trip';
  end if;

  -- Trip row (null if unchanged since cursor)
  select to_jsonb(t) into v_trip
  from public.trips t
  where t.id = p_trip_id and t.updated_at > v_since;

  -- Members changed since cursor
  select jsonb_agg(to_jsonb(m)) into v_members
  from public.members m
  where m.trip_id = p_trip_id and m.updated_at > v_since;

  -- Groups changed since cursor
  select jsonb_agg(to_jsonb(g)) into v_groups
  from public.groups g
  where g.trip_id = p_trip_id and g.updated_at > v_since;

  -- Group-member mappings for groups in this trip
  select jsonb_agg(to_jsonb(gm)) into v_group_members
  from public.group_members gm
  where gm.group_id in (select g.id from public.groups g where g.trip_id = p_trip_id);

  -- Categories changed since cursor
  select jsonb_agg(to_jsonb(c)) into v_categories
  from public.categories c
  where c.trip_id = p_trip_id and c.updated_at > v_since;

  -- Active expenses changed since cursor
  select jsonb_agg(to_jsonb(e)) into v_expenses
  from public.expenses e
  where e.trip_id = p_trip_id
    and e.updated_at > v_since
    and e.deleted_at is null;

  -- Deleted expense tombstones since cursor
  select jsonb_agg(e.id) into v_tombstone_expenses
  from public.expenses e
  where e.trip_id = p_trip_id
    and e.deleted_at is not null
    and e.deleted_at > v_since;

  return jsonb_build_object(
    'server_time', v_server_time,
    'trip', v_trip,
    'members', coalesce(v_members, '[]'::jsonb),
    'groups', coalesce(v_groups, '[]'::jsonb),
    'group_members', coalesce(v_group_members, '[]'::jsonb),
    'categories', coalesce(v_categories, '[]'::jsonb),
    'expenses', coalesce(v_expenses, '[]'::jsonb),
    'tombstones', jsonb_build_object(
      'expenses', coalesce(v_tombstone_expenses, '[]'::jsonb)
    )
  );
end;
$$;

grant execute on function public.get_trip_changes(uuid, timestamptz) to authenticated;

notify pgrst, 'reload schema';
