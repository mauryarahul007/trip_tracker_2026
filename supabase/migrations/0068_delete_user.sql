-- Superadmin-gated hard account deletion. Mirrors set_user_banned's guard
-- style (0060): blocks deleting a superadmin, blocks self-delete. profiles
-- and trips.owner_id cascade off auth.users (0001); members.linked_user_id
-- sets null. expenses.created_by_user_id has no cascade -- block deletion
-- with a clear message instead of surfacing a raw FK violation.
create or replace function public.delete_user(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot delete your own account.';
  end if;
  if exists (select 1 from public.superadmins s where s.user_id = p_user_id) then
    raise exception 'Cannot delete a superadmin account.';
  end if;
  if exists (select 1 from public.expenses e where e.created_by_user_id = p_user_id) then
    raise exception 'This account has expense history and cannot be deleted. Suspend it instead.';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
