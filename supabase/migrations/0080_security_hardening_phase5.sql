-- ============================================================================
-- Migration 0080: Security Hardening Phase 5
-- Closes gaps found in a full RLS audit (all 79 prior migrations read in
-- order for final-state posture, not history). Each section names the gap
-- it closes and why the fix doesn't regress the migration that came before it.
-- ============================================================================

-- ---- 1. profiles: stop leaking every user's email to every signed-in user ----
-- "readable by authenticated users" (0001) used using(true) -- any signed-in
-- user could select the full profiles table (id, email, banned) regardless
-- of shared trip membership. fetchAllProfilesForAdmin() only restricted this
-- in the UI, not RLS. Scope visibility to: your own row, a superadmin, or
-- someone you actually share a trip with.
drop policy if exists "profiles are readable by authenticated users" on public.profiles;

create policy "profiles readable by self, superadmin, or trip co-members"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_superadmin()
    or exists (
      select 1
      from public.members m1
      join public.members m2 on m1.trip_id = m2.trip_id
      where m1.linked_user_id = auth.uid()
        and m2.linked_user_id = profiles.id
    )
  );

-- ---- 2. profiles: close the self-unban hole ----
-- "users can update their own profile" (0001) has with check(id=auth.uid())
-- and no column restriction. profiles.banned was added later (0060) with no
-- matching guard, so any banned user can run
-- `update profiles set banned=false where id=auth.uid()` directly and defeat
-- suspension. set_user_banned() (0060/0062) is security definer, so it runs
-- as the function owner and is unaffected by this revoke -- the RPC keeps
-- working, direct client writes don't.
--
-- A plain `revoke update (banned) ... from authenticated` is NOT enough:
-- Supabase's default bootstrap grants table-level UPDATE on every public
-- table to `authenticated`, and a table-level grant supersedes a
-- column-level revoke in Postgres -- information_schema.column_privileges
-- still reported `banned` as writable after a column-only revoke (caught by
-- re-checking privileges after applying this migration the first time).
-- The table-level grant has to be revoked and replaced with an explicit
-- column allowlist for it to actually take effect.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- ---- 3. security_audit_logs: stop leaking superadmin actions ----
-- The select policy (0048) was `trip_id is null or is_trip_admin(trip_id)`.
-- Every global superadmin action (bans, app_config changes, broadcasts) logs
-- with trip_id = null, and that branch had no is_superadmin() gate -- any
-- signed-in traveler could read the full global audit trail.
drop policy if exists "trip admins can view security audit logs" on public.security_audit_logs;

create policy "trip admins can view security audit logs"
  on public.security_audit_logs for select
  to authenticated
  using (
    (trip_id is null and public.is_superadmin())
    or (trip_id is not null and public.is_trip_admin(trip_id))
  );

-- ---- 4. log_security_event(): require real authority over what's logged ----
-- Granted to `authenticated` (0048) so the admin portal could log plain-table
-- writes without a dedicated RPC per action (see tripApi.ts's
-- logSuperadminAction comment) -- but it never checked the caller actually
-- had authority over p_trip_id, so any signed-in user could forge/pollute
-- audit entries for trips (or the global log) they have no rights over.
-- logSuperadminAction() is only called from superadmin-gated portal pages
-- with real trip ids or null for global actions, so this check doesn't
-- change any legitimate call site.
create or replace function public.log_security_event(
  p_trip_id uuid,
  p_action text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_trip_id is null then
    if not public.is_superadmin() then
      raise exception 'Superadmin access required to log a global security event.';
    end if;
  else
    if not public.is_trip_admin(p_trip_id) then
      raise exception 'Trip admin access required to log a security event for this trip.';
    end if;
  end if;

  insert into public.security_audit_logs (trip_id, actor_user_id, action, details)
  values (p_trip_id, auth.uid(), p_action, p_details);
end;
$$;

-- ---- 5. bugs: drop the raw insert policy now that report_bug() exists ----
-- 0058 added `with check(true)` insert so travelers could file reports
-- before report_bug() (0059) existed to control id generation and force
-- status='open'. bugApi.ts's createBug now calls the RPC exclusively
-- (security definer, so it's unaffected by this drop) -- the raw policy is
-- dead weight that lets any authenticated user bypass the RPC: forge an id,
-- set status='resolved', spoof resolution_note/found_by.
drop policy if exists "authenticated users can report bugs" on public.bugs;

-- ---- 6. expenses: validate paid_by/split_member_ids stay within the trip ----
-- paid_by's FK was dropped in 0002 (intentionally -- a deleted member's past
-- expenses should keep rendering as "[Deleted Member]", not block the
-- delete). split_member_ids (a uuid[]) never had one; Postgres can't FK into
-- an array element anyway. Nothing enforced that either value referenced a
-- member of *this* trip, and 0071 widened the update WITH CHECK further --
-- a non-admin original author could reassign an expense's paid_by/
-- split_member_ids to any member id, including one from a different trip,
-- corrupting settlement math with no cross-trip data exposure.
--
-- Only re-validates when the column is actually *changing* (TG_OP='INSERT'
-- or IS DISTINCT FROM OLD) so 0071's fix keeps working: editing some other
-- field on an expense whose paid_by already dangles from a since-deleted
-- member (the exact scenario 0071 exists for) doesn't re-trigger this check
-- against that now-nonexistent id.
create or replace function public.validate_expense_member_refs()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.paid_by is distinct from old.paid_by then
    if new.paid_by is not null and not exists (
      select 1 from public.members m where m.id = new.paid_by and m.trip_id = new.trip_id
    ) then
      raise exception 'paid_by member % does not belong to trip %', new.paid_by, new.trip_id;
    end if;
  end if;

  if tg_op = 'INSERT' or new.split_member_ids is distinct from old.split_member_ids then
    if new.split_member_ids is not null and array_length(new.split_member_ids, 1) > 0 then
      if exists (
        select 1 from unnest(new.split_member_ids) as sid
        where not exists (select 1 from public.members m where m.id = sid and m.trip_id = new.trip_id)
      ) then
        raise exception 'split_member_ids contains a member not in trip %', new.trip_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_expense_member_refs_trigger on public.expenses;
create trigger validate_expense_member_refs_trigger
  before insert or update on public.expenses
  for each row execute function public.validate_expense_member_refs();

-- ---- 7. expenses: enforce the viewer role server-side, not just in the UI ----
-- trips.member_roles (0077) is read by memberRoles.ts to disable the add/edit
-- expense UI for a 'viewer', but RLS never checked it -- a viewer-role
-- account could still insert/edit expenses via a direct API call. Default
-- (no entry in member_roles, or any role other than 'viewer') stays
-- unrestricted, matching getMemberRole()'s client-side default.
drop policy if exists "admin or involved participant can create expenses" on public.expenses;

create policy "admin or involved participant can create expenses"
  on public.expenses for insert
  to authenticated
  with check (
    public.is_trip_admin(trip_id)
    or (
      public.is_trip_participant(trip_id)
      and created_by_user_id = auth.uid()
      and (paid_by = public.my_member_id(trip_id) or public.my_member_id(trip_id) = any (split_member_ids))
      and coalesce(
        (select t.member_roles ->> (public.my_member_id(trip_id))::text from public.trips t where t.id = trip_id),
        'contributor'
      ) <> 'viewer'
    )
  );

drop policy if exists "admin or original author can update expenses" on public.expenses;

create policy "admin or original author can update expenses"
  on public.expenses for update
  to authenticated
  using (
    public.is_trip_admin(trip_id)
    or (
      created_by_user_id = auth.uid()
      and coalesce(
        (select t.member_roles ->> (public.my_member_id(trip_id))::text from public.trips t where t.id = trip_id),
        'contributor'
      ) <> 'viewer'
    )
  )
  with check (
    public.is_trip_admin(trip_id)
    or (
      created_by_user_id = auth.uid()
      and coalesce(
        (select t.member_roles ->> (public.my_member_id(trip_id))::text from public.trips t where t.id = trip_id),
        'contributor'
      ) <> 'viewer'
    )
  );

notify pgrst, 'reload schema';
