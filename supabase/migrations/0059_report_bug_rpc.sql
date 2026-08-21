-- createBug() for a normal (non-superadmin) user was broken two ways:
-- 1. It ran `select id from bugs` to compute the next BUG-XXX number, but
--    SELECT on bugs is superadmin-only (0055/0058) -- a normal user always
--    got back zero rows, so every report tried to insert as "BUG-001" and
--    collided with the real BUG-001 (primary key violation).
-- 2. `.insert(...).select().single()` requires read-back permission on
--    the inserted row too -- also superadmin-only, so even a
--    non-colliding insert would fail to return anything.
--
-- A SECURITY DEFINER function sidesteps both: it computes the id and
-- performs the insert as its owner (bypassing RLS internally), and
-- returns the row directly as the RPC's own result -- not a table query,
-- so the caller's lack of SELECT on public.bugs is irrelevant.
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
  p_diagnostics jsonb
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
    environment, repro_steps, expected_behavior, actual_behavior, diagnostics
  ) values (
    next_id, p_title, p_description, p_severity, p_category, 'open', p_found_by,
    p_environment, p_repro_steps, p_expected_behavior, p_actual_behavior, p_diagnostics
  )
  returning * into result;

  return result;
end;
$$;

grant execute on function public.report_bug(
  text, text, text, text, text, jsonb, text[], text, text, jsonb
) to authenticated;

notify pgrst, 'reload schema';
