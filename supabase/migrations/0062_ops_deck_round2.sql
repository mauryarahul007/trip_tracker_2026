-- ============================================================================
-- Migration 0062: Ops Deck Round 2
-- Notification delivery stats, recycled-expense count, a configurable
-- (rather than hardcoded) expense amount ceiling, audit-log purge, and
-- log_security_event() calls wired into the superadmin RPCs so the
-- security_audit_logs table (0048) actually has content -- nothing wrote
-- to it before this.
-- ============================================================================

-- ---- notification delivery health (aggregate only -- no row content, no PII) ----

create or replace function public.get_notification_stats()
returns table (total_count bigint, read_count bigint, last_7d_count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  return query
    select
      count(*),
      count(*) filter (where read = true),
      count(*) filter (where created_at > now() - interval '7 days')
    from public.notifications;
end;
$$;

grant execute on function public.get_notification_stats() to authenticated;

-- ---- recycle-bin snapshot count ----

create or replace function public.count_recycled_expenses()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  select count(*) into v_count from public.expenses where deleted_at is not null;
  return v_count;
end;
$$;

grant execute on function public.count_recycled_expenses() to authenticated;

-- ---- configurable expense amount ceiling ----
-- A plain CHECK constraint can't read app_config (no subqueries allowed),
-- so the static upper bound from 0048 becomes a trigger instead. The
-- lower bound (amount > 0) stays a real constraint -- that invariant
-- never needs to change.

alter table public.expenses
  drop constraint if exists expenses_amount_positive_check,
  add constraint expenses_amount_positive_check check (amount > 0);

create or replace function public.enforce_expense_amount_ceiling()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_ceiling numeric;
begin
  select (value #>> '{}')::numeric into v_ceiling from public.app_config where key = 'expense_amount_ceiling';
  if v_ceiling is null then
    v_ceiling := 999999999.99;
  end if;
  if new.amount > v_ceiling then
    raise exception 'Expense amount exceeds the configured ceiling of %.', v_ceiling;
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_amount_ceiling_trigger on public.expenses;
create trigger expenses_amount_ceiling_trigger
  before insert or update of amount on public.expenses
  for each row execute function public.enforce_expense_amount_ceiling();

-- ---- audit log purge (manual RPC + auto pg_cron, same pattern as the recycle bin) ----

create or replace function public.purge_audit_logs_older_than(p_days integer default 90)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  delete from public.security_audit_logs where created_at < now() - (p_days || ' days')::interval;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.purge_audit_logs_older_than(integer) to authenticated;

create or replace function public.purge_expired_audit_logs()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_days integer;
begin
  select (value #>> '{}')::int into v_days from public.app_config where key = 'audit_log_retention_days';
  if v_days is null then
    v_days := 90;
  end if;
  delete from public.security_audit_logs where created_at < now() - (v_days || ' days')::interval;
end;
$$;

revoke all on function public.purge_expired_audit_logs() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'purge-audit-logs';
select cron.schedule(
  'purge-audit-logs',
  '0 3 * * *',
  $$select public.purge_expired_audit_logs()$$
);

-- ---- wire log_security_event() into the superadmin RPCs so the audit
-- table (previously write-only-and-never-written) actually gets content ----

create or replace function public.set_user_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  if exists (select 1 from public.superadmins s where s.user_id = p_user_id) then
    raise exception 'Cannot suspend a superadmin account.';
  end if;
  update public.profiles set banned = p_banned where id = p_user_id;
  perform public.log_security_event(null, case when p_banned then 'user_suspended' else 'user_restored' end, jsonb_build_object('target_user_id', p_user_id));
end;
$$;

create or replace function public.broadcast_notification(
  p_title text,
  p_body text,
  p_trip_id uuid default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;

  if p_trip_id is null then
    insert into public.notifications (user_id, trip_id, title, body, data)
    select id, null, p_title, p_body, jsonb_build_object('type', 'admin_broadcast')
    from public.profiles;
  else
    insert into public.notifications (user_id, trip_id, title, body, data)
    select distinct m.linked_user_id, p_trip_id, p_title, p_body, jsonb_build_object('type', 'admin_broadcast')
    from public.members m
    where m.trip_id = p_trip_id and m.linked_user_id is not null;
  end if;

  get diagnostics v_count = row_count;
  perform public.log_security_event(p_trip_id, 'broadcast_notification', jsonb_build_object('title', p_title, 'recipient_count', v_count));
  return v_count;
end;
$$;

create or replace function public.purge_recycle_bin_older_than(p_days integer default 30)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  delete from public.expenses
  where deleted_at is not null
    and deleted_at < now() - (p_days || ' days')::interval;
  get diagnostics v_count = row_count;
  perform public.log_security_event(null, 'purge_recycle_bin', jsonb_build_object('days', p_days, 'purged_count', v_count));
  return v_count;
end;
$$;

create or replace function public.set_app_config(p_key text, p_value jsonb)
returns public.app_config
language plpgsql
security definer set search_path = public
as $$
declare
  result public.app_config;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  insert into public.app_config (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid()
  returning * into result;
  perform public.log_security_event(null, 'set_app_config', jsonb_build_object('key', p_key, 'value', p_value));
  return result;
end;
$$;

notify pgrst, 'reload schema';
