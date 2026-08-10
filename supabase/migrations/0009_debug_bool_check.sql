create function public.debug_bool_check(p_owner_id uuid)
returns table (owner_id uuid, uid uuid, are_equal boolean, types_match text)
language sql
as $$
  select p_owner_id, auth.uid(), (p_owner_id = auth.uid()), pg_typeof(p_owner_id)::text || ' vs ' || pg_typeof(auth.uid())::text;
$$;

grant execute on function public.debug_bool_check(uuid) to authenticated;
