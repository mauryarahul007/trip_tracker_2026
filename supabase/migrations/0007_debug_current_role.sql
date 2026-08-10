-- Temporary diagnostic — checking whether Postgres's actual session role
-- matches the JWT's role claim (auth.role() reads the claim, not
-- current_role, so these can diverge if PostgREST didn't actually switch
-- roles — which would explain an RLS "TO authenticated" policy rejecting
-- a request whose JWT claims say role=authenticated).
create function public.debug_current_role()
returns table (pg_current_role text, pg_session_user text, jwt_role_claim text, uid uuid)
language sql
as $$
  select current_role::text, session_user::text, auth.role(), auth.uid();
$$;

grant execute on function public.debug_current_role() to authenticated;
