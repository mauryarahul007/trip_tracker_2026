-- Recycle bin: expense delete becomes a soft-delete (deleted_at timestamp)
-- instead of a hard DELETE, so it can be reviewed/restored from Settings.
-- A pg_cron job permanently purges anything past a 24h grace window.

alter table public.expenses
  add column deleted_at timestamptz,
  add column deleted_by_user_id uuid references public.profiles (id);

create index expenses_trip_deleted_idx on public.expenses (trip_id, deleted_at);

-- Runs only via pg_cron (as postgres), never exposed to client roles —
-- the 24h grace window must not be triggerable/bypassable from the app.
create or replace function public.purge_expired_recycle_bin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.expenses
  where deleted_at is not null
    and deleted_at < now() - interval '24 hours';
end;
$$;

revoke all on function public.purge_expired_recycle_bin() from public, anon, authenticated;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'purge-recycle-bin';

select cron.schedule(
  'purge-recycle-bin',
  '0 * * * *',
  $$select public.purge_expired_recycle_bin()$$
);
