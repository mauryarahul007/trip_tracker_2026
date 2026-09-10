-- Wave 2 bug-ledger fields: assignee, github SHA, fingerprint grouping,
-- and an activity log. Travelers still cannot SELECT the table; list_my_bug_reports
-- is a SECURITY DEFINER RPC so they can see status of tickets they filed.

alter table public.bugs
  add column if not exists assignee text,
  add column if not exists github_sha text,
  add column if not exists fingerprint text,
  add column if not exists activity jsonb not null default '[]'::jsonb;

create index if not exists bugs_fingerprint_idx
  on public.bugs (fingerprint)
  where fingerprint is not null;

drop function if exists public.report_bug(text, text, text, text, text, jsonb, text[], text, text, jsonb);
drop function if exists public.report_bug(text, text, text, text, text, jsonb, text[], text, text, jsonb, text);

create or replace function public.report_bug(
  p_title text,
  p_description text,
  p_severity text,
  p_category text,
  p_found_by text,
  p_environment jsonb,
  p_repro_steps text[],
  p_expected_behavior text,
  p_actual_behavior text,
  p_diagnostics jsonb,
  p_fingerprint text default null
) returns public.bugs
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id text;
  result public.bugs;
begin
  select 'BUG-' || lpad(
    (coalesce(max((regexp_match(id, '^BUG-(\d+)$'))[1]::int), 0) + 1)::text,
    3, '0'
  )
  into next_id
  from public.bugs
  where id ~ '^BUG-\d+$';

  insert into public.bugs (
    id, title, description, severity, category, status, found_by,
    environment, repro_steps, expected_behavior, actual_behavior, diagnostics,
    fingerprint
  ) values (
    next_id, p_title, p_description, p_severity, p_category, 'open', p_found_by,
    p_environment, p_repro_steps, p_expected_behavior, p_actual_behavior, p_diagnostics,
    p_fingerprint
  )
  returning * into result;

  return result;
end;
$$;

grant execute on function public.report_bug(
  text, text, text, text, text, jsonb, text[], text, text, jsonb, text
) to authenticated;

-- Also keep the 10-arg form callable (PostgREST named args still work via
-- the 11-arg function with a default). Grant the defaulted signature only.

create or replace function public.list_my_bug_reports()
returns table (
  id text,
  title text,
  status text,
  severity text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid text := auth.uid()::text;
  mail text := coalesce(auth.jwt() ->> 'email', '');
begin
  return query
  select b.id, b.title, b.status, b.severity, b.created_at, b.updated_at
  from public.bugs b
  where (mail <> '' and lower(b.found_by) = lower(mail))
     or (uid is not null and b.found_by = uid)
  order by b.created_at desc
  limit 50;
end;
$$;

grant execute on function public.list_my_bug_reports() to authenticated;

notify pgrst, 'reload schema';
