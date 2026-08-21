-- The Flags tab (global toggle + Per-Trip Override + Per-Member Override)
-- has looked functional since it was built, but featureFlags/
-- tripFlagOverrides/userFlagOverrides were only ever local Zustand
-- `persist` state -- localStorage on whichever device the superadmin
-- happened to be using. Toggling a flag on a laptop never reached any
-- other device; every "override" quietly only ever applied to the admin's
-- own browser. This is the real backend those actions were missing.

create table public.feature_flag_overrides (
  scope text not null check (scope in ('global', 'trip', 'user')),
  -- '' for global scope; a trip id (as text) for trip scope; a user id
  -- (as text) for user scope. Not a uuid column since scope_id has no
  -- single meaning across the three scopes.
  scope_id text not null default '',
  flag_key text not null,
  value boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  primary key (scope, scope_id, flag_key)
);

alter table public.feature_flag_overrides enable row level security;
-- No direct client access at all -- every read/write goes through the
-- RPCs below, same reasoning as app_config (0060): a normal user's own
-- resolved flags must be readable without granting them visibility into
-- every other user's/trip's overrides.
revoke all on public.feature_flag_overrides from anon, authenticated;

-- Every client (any authenticated user) calls this to resolve their own
-- flags -- returns the raw layers, not a merged result, so the existing
-- client-side isFeatureActive() priority logic (user > trip > global >
-- default) stays the single source of truth for how they combine.
create or replace function public.get_resolved_feature_flags(p_trip_id uuid default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_global jsonb;
  v_trip jsonb;
  v_user jsonb;
begin
  select coalesce(jsonb_object_agg(flag_key, value), '{}'::jsonb) into v_global
  from public.feature_flag_overrides where scope = 'global';

  if p_trip_id is not null then
    select coalesce(jsonb_object_agg(flag_key, value), '{}'::jsonb) into v_trip
    from public.feature_flag_overrides where scope = 'trip' and scope_id = p_trip_id::text;
  else
    v_trip := '{}'::jsonb;
  end if;

  select coalesce(jsonb_object_agg(flag_key, value), '{}'::jsonb) into v_user
  from public.feature_flag_overrides where scope = 'user' and scope_id = auth.uid()::text;

  return jsonb_build_object('global', v_global, 'trip', v_trip, 'user', v_user);
end;
$$;

grant execute on function public.get_resolved_feature_flags(uuid) to authenticated;

-- Superadmin-only: the Ops Deck's Per-Trip/Per-Member override panels need
-- to show what's already set for WHICHEVER trip/member gets picked in the
-- dropdown, not just the caller's own -- get_resolved_feature_flags alone
-- can't do that.
create or replace function public.get_all_feature_flag_overrides()
returns setof public.feature_flag_overrides
language sql
security definer set search_path = public
stable
as $$
  select * from public.feature_flag_overrides where public.is_superadmin();
$$;

grant execute on function public.get_all_feature_flag_overrides() to authenticated;

create or replace function public.set_feature_flag_override(
  p_scope text,
  p_scope_id text,
  p_flag_key text,
  p_value boolean
) returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin access required.';
  end if;
  if p_scope not in ('global', 'trip', 'user') then
    raise exception 'Invalid scope.';
  end if;

  if p_value is null then
    delete from public.feature_flag_overrides where scope = p_scope and scope_id = p_scope_id and flag_key = p_flag_key;
  else
    insert into public.feature_flag_overrides (scope, scope_id, flag_key, value, updated_at, updated_by)
    values (p_scope, p_scope_id, p_flag_key, p_value, now(), auth.uid())
    on conflict (scope, scope_id, flag_key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  end if;

  perform public.log_security_event(
    case when p_scope = 'trip' then p_scope_id::uuid else null end,
    'set_feature_flag_override',
    jsonb_build_object('scope', p_scope, 'scope_id', p_scope_id, 'flag_key', p_flag_key, 'value', p_value)
  );
end;
$$;

grant execute on function public.set_feature_flag_override(text, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
