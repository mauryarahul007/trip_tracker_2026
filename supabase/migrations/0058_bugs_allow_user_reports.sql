-- 0055's "superadmins manage bugs" policy covers ALL operations, so a
-- normal traveler's BugReportModal submission (createBug -> insert) was
-- silently rejected by RLS -- only a superadmin could file a report.
-- Split it: any authenticated user can file a report (insert only, no
-- select/update/delete -- they can't read, edit, or resolve the ledger),
-- superadmins keep full read/manage access same as before.

drop policy if exists "superadmins manage bugs" on public.bugs;

create policy "superadmins manage bugs"
  on public.bugs for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "authenticated users can report bugs"
  on public.bugs for insert
  to authenticated
  with check (true);

notify pgrst, 'reload schema';
