create function public.debug_table_grants()
returns table (grantee text, privilege_type text)
language sql
security definer set search_path = public
as $$
  select grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'trips';
$$;

grant execute on function public.debug_table_grants() to authenticated;
