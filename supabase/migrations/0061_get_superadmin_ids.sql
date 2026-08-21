-- The Users tab needs to know which accounts are superadmins so it can
-- tag them and disable Suspend -- but public.superadmins (0057) has zero
-- RLS policies, so even a superadmin can't SELECT it directly from the
-- client. A SECURITY DEFINER RPC exposes just the id list.
create or replace function public.get_superadmin_ids()
returns setof uuid
language sql
security definer set search_path = public
stable
as $$
  select user_id from public.superadmins where public.is_superadmin();
$$;

grant execute on function public.get_superadmin_ids() to authenticated;

notify pgrst, 'reload schema';
