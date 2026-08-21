-- ============================================================================
-- Migration 0048: Security Hardening Phase 3 (Payload Constraints & Audit Logging)
-- ============================================================================

-- 1. Database-level Input Length & Value Boundary Constraints
-- Prevents memory exhaustion, payload flooding, and corrupt data injection.

-- Trips table constraints
alter table public.trips
  drop constraint if exists trips_name_length_check,
  add constraint trips_name_length_check check (length(trim(name)) > 0 and length(name) <= 100);

alter table public.trips
  drop constraint if exists trips_currency_length_check,
  add constraint trips_currency_length_check check (length(trim(base_currency)) between 2 and 10);

alter table public.trips
  drop constraint if exists trips_date_range_check,
  add constraint trips_date_range_check check (start_date <= end_date);

-- Members table constraints
alter table public.members
  drop constraint if exists members_name_length_check,
  add constraint members_name_length_check check (length(trim(name)) > 0 and length(name) <= 100);

-- Groups table constraints
alter table public.groups
  drop constraint if exists groups_name_length_check,
  add constraint groups_name_length_check check (length(trim(name)) > 0 and length(name) <= 100);

-- Categories table constraints
alter table public.categories
  drop constraint if exists categories_name_length_check,
  add constraint categories_name_length_check check (length(trim(name)) > 0 and length(name) <= 50);

-- Expenses table constraints
alter table public.expenses
  drop constraint if exists expenses_title_length_check,
  add constraint expenses_title_length_check check (length(trim(title)) > 0 and length(title) <= 200);

alter table public.expenses
  drop constraint if exists expenses_amount_positive_check,
  add constraint expenses_amount_positive_check check (amount > 0 and amount <= 999999999.99);

alter table public.expenses
  drop constraint if exists expenses_currency_length_check,
  add constraint expenses_currency_length_check check (length(trim(currency)) between 2 and 10);

-- 2. Security Audit Log Table
-- Records critical security actions (member deletions, admin role transfers, invite lockouts).
create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_audit_trip_idx on public.security_audit_logs (trip_id, created_at desc);
create index if not exists security_audit_actor_idx on public.security_audit_logs (actor_user_id);

alter table public.security_audit_logs enable row level security;

-- Only trip admins can read audit logs for their trip
drop policy if exists "trip admins can view security audit logs" on public.security_audit_logs;
create policy "trip admins can view security audit logs"
  on public.security_audit_logs for select
  to authenticated
  using (
    trip_id is null or public.is_trip_admin(trip_id)
  );

-- Revoke direct mutation access from clients (logs must be written via internal RPC/triggers)
revoke insert, update, delete on public.security_audit_logs from anon, authenticated;

-- Helper RPC for logging security events
create or replace function public.log_security_event(
  p_trip_id uuid,
  p_action text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.security_audit_logs (trip_id, actor_user_id, action, details)
  values (p_trip_id, auth.uid(), p_action, p_details);
end;
$$;

grant execute on function public.log_security_event(uuid, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
