-- Superadmin's manual "purge old audit logs" action (AdminToolsPage-adjacent
-- Audit tab) deleted rows without leaving any trace of who did it or how
-- many rows went. Since the new log row is inserted with created_at = now(),
-- it's never older than p_days and so never gets swept up by the very purge
-- it's recording.

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
  perform public.log_security_event(null, 'purge_audit_logs', jsonb_build_object('days', p_days, 'purged_count', v_count));
  return v_count;
end;
$$;

grant execute on function public.purge_audit_logs_older_than(integer) to authenticated;

notify pgrst, 'reload schema';
