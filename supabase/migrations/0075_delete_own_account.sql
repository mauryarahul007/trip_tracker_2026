-- Self-service account deletion, required by Apple App Review Guideline
-- 5.1.1 (in-app account deletion) and Google Play's account-deletion
-- policy. delete_user (0068, 0072) is a superadmin moderation tool that
-- explicitly blocks self-delete -- this is the opposite: any authenticated
-- user deleting their own account, no superadmin gate.
--
-- Deleting auth.users cascades to profiles (0001: profiles.id references
-- auth.users on delete cascade), and from there to every trip the caller
-- owns (0001: trips.owner_id references profiles on delete cascade) --
-- including trips shared with other members, which lose that trip entirely
-- too. members.linked_user_id and expenses.created_by_user_id both set
-- null on delete instead of cascading (0001, 0072), so trips the caller
-- only belongs to (doesn't own) survive with their history intact. The
-- confirmation UI must warn about the owned-trips deletion before calling
-- this -- the database has no way to ask "are you sure" on the caller's
-- behalf.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.superadmins s where s.user_id = auth.uid()) then
    raise exception 'Superadmin accounts cannot self-delete here. Contact another superadmin.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

notify pgrst, 'reload schema';
