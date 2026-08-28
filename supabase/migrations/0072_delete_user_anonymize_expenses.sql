-- Superadmin "delete user" (0068) refused to delete any account with expense
-- history, since expenses.created_by_user_id was `not null` with a plain FK
-- (no cascade) -- deleting the account would either orphan those rows or
-- surface a raw FK violation, so it raised an exception telling the admin to
-- suspend instead.
--
-- Anonymize instead of blocking: relax created_by_user_id to nullable and
-- give its FK `on delete set null`, mirroring members.linked_user_id (0001).
-- Expense content (title/amount/split/etc.) is untouched; only the "who
-- created this" attribution is cleared once that account is gone. Permission
-- checks comparing created_by_user_id = auth.uid() simply stop matching once
-- it's null, leaving trip admins as the only ones who can still manage the
-- expense -- same fallback already used for a deleted split participant.

alter table public.expenses
  alter column created_by_user_id drop not null;

alter table public.expenses
  drop constraint expenses_created_by_user_id_fkey;

alter table public.expenses
  add constraint expenses_created_by_user_id_fkey
  foreign key (created_by_user_id) references public.profiles (id) on delete set null;

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
  delete from auth.users where id = p_user_id;
end;
$$;

notify pgrst, 'reload schema';
