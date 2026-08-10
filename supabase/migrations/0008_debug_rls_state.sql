-- Temporary diagnostic — checking relrowsecurity/relforcerowsecurity and
-- whether the policies are actually PERMISSIVE (not RESTRICTIVE, which
-- would AND against the permissive ones and could deny even when the
-- permissive check passes).
create function public.debug_rls_state()
returns table (
  relrowsecurity boolean,
  relforcerowsecurity boolean,
  policyname text,
  permissive text,
  cmd text
)
language sql
security definer set search_path = public
as $$
  select c.relrowsecurity, c.relforcerowsecurity, p.policyname, p.permissive, p.cmd
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
  where n.nspname = 'public' and c.relname = 'trips';
$$;

grant execute on function public.debug_rls_state() to authenticated;
