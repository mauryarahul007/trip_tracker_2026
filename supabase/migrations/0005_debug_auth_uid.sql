-- Temporary diagnostic function — will be dropped alongside 0004's.
create function public.debug_auth_context()
returns table (uid uuid, role text, jwt_claims text)
language sql
security definer set search_path = public
as $$
  select auth.uid(), auth.role(), current_setting('request.jwt.claims', true);
$$;

grant execute on function public.debug_auth_context() to authenticated;
