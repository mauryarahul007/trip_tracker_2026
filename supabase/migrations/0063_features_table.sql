-- Feature Additions Tracker -- parallel system to the Bug Ledger (0055/
-- 0058/0059), same shape: any authenticated user can submit a request
-- (via a SECURITY DEFINER RPC, since they can't SELECT the ledger to
-- compute the next id or read the inserted row back), only superadmin
-- can read/triage.

create table public.features (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null check (category in (
    'ui-ux', 'analytics', 'admin', 'sync', 'notifications', 'security', 'performance', 'native', 'general'
  )),
  status text not null default 'requested' check (status in (
    'requested', 'planned', 'in_progress', 'shipped', 'wont_do'
  )),
  requested_by text not null default 'unknown',
  environment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shipped_at timestamptz,
  shipped_by text,
  shipped_note text,
  -- Optional link to an existing FeatureFlagKey (utils/featureFlags.ts) --
  -- not a foreign key, since that's a TS-level enum, not a DB table. Lets
  -- the Features tab show/flip the flag inline instead of a separate trip
  -- to Flags. Deliberately NOT a mechanism to gate arbitrary code: a flag
  -- only controls behavior where the app was actually built to check it,
  -- so this can only point at a flag key that already exists in code.
  linked_flag_key text
);

create index features_status_idx on public.features (status);

alter table public.features enable row level security;

-- Internal tool: superadmin-only, same as the Bug Ledger.
create policy "superadmins manage features"
  on public.features for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create or replace function public.submit_feature_request(
  p_title text,
  p_description text,
  p_category text,
  p_requested_by text,
  p_environment jsonb
) returns public.features
language plpgsql
security definer set search_path = public
as $$
declare
  next_id text;
  result public.features;
begin
  select 'FEAT-' || lpad(
    (coalesce(max((regexp_match(id, '^FEAT-(\d+)$'))[1]::int), 0) + 1)::text,
    3, '0'
  )
  into next_id
  from public.features
  where id ~ '^FEAT-\d+$';

  insert into public.features (
    id, title, description, category, status, requested_by, environment
  ) values (
    next_id, p_title, p_description, p_category, 'requested', p_requested_by, p_environment
  )
  returning * into result;

  return result;
end;
$$;

grant execute on function public.submit_feature_request(text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
