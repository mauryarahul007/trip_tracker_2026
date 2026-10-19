-- ============================================================================
-- Migration 0112: Native App Version Gate & Remote Kill Switch
-- Purpose:
--   Provides server-driven version enforcement and kill-switch capabilities
--   for native mobile clients (iOS & Android) that cannot receive web OTA bundles.
--   Reuses the existing public.app_config table so superadmins can update
--   minimum supported versions, recommended versions, store links, and
--   maintenance messaging via the Ops Deck without schema alterations.
--
-- Backwards Compatibility:
--   - Additive keys in app_config.
--   - Does not alter existing web app_config keys (signup_gate, join_max_attempts, etc.).
--   - New RPC get_app_version_gate is available to both anon and authenticated callers.
--
-- Rollback SQL:
--   drop function if exists public.get_app_version_gate(text, text, text);
--   drop function if exists public.semver_compare(text, text);
--   delete from public.app_config where key in (
--     'min_supported_version_ios', 'min_supported_version_android',
--     'recommended_version_ios', 'recommended_version_android',
--     'store_url_ios', 'store_url_android',
--     'maintenance_mode', 'maintenance_message'
--   );
--   notify pgrst, 'reload schema';
-- ============================================================================

-- Seed default version gate configuration in app_config if absent
insert into public.app_config (key, value) values
  ('min_supported_version_ios', '"1.0.0"'::jsonb),
  ('min_supported_version_android', '"1.0.0"'::jsonb),
  ('recommended_version_ios', '"1.0.0"'::jsonb),
  ('recommended_version_android', '"1.0.0"'::jsonb),
  ('store_url_ios', '"https://apps.apple.com/app/id6470000000"'::jsonb),
  ('store_url_android', '"https://play.google.com/store/apps/details?id=com.triptracker.app"'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('maintenance_message', '"Trip Tracker is currently undergoing scheduled maintenance. Please check back shortly."'::jsonb)
on conflict (key) do nothing;

-- Deterministic semver comparison helper
-- Returns:
--   -1 if v1 < v2
--    0 if v1 = v2
--    1 if v1 > v2
create or replace function public.semver_compare(v1 text, v2 text)
returns integer
language plpgsql
immutable
as $$
declare
  v1_clean text;
  v2_clean text;
  p1 int[];
  p2 int[];
begin
  if v1 is null or v2 is null then
    return 0;
  end if;

  -- Strip build numbers (+...) and prerelease tags (-...)
  v1_clean := split_part(split_part(btrim(v1), '+', 1), '-', 1);
  v2_clean := split_part(split_part(btrim(v2), '+', 1), '-', 1);

  begin
    p1 := array[
      coalesce(nullif(split_part(v1_clean, '.', 1), '')::int, 0),
      coalesce(nullif(split_part(v1_clean, '.', 2), '')::int, 0),
      coalesce(nullif(split_part(v1_clean, '.', 3), '')::int, 0)
    ];
    p2 := array[
      coalesce(nullif(split_part(v2_clean, '.', 1), '')::int, 0),
      coalesce(nullif(split_part(v2_clean, '.', 2), '')::int, 0),
      coalesce(nullif(split_part(v2_clean, '.', 3), '')::int, 0)
    ];
  exception when others then
    return 0;
  end;

  if p1[1] > p2[1] then return 1; end if;
  if p1[1] < p2[1] then return -1; end if;
  if p1[2] > p2[2] then return 1; end if;
  if p1[2] < p2[2] then return -1; end if;
  if p1[3] > p2[3] then return 1; end if;
  if p1[3] < p2[3] then return -1; end if;

  return 0;
end;
$$;

-- Anon-accessible version gate and maintenance status RPC
create or replace function public.get_app_version_gate(
  p_client text default 'flutter',
  p_platform text default null,
  p_version text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_plat text := lower(coalesce(p_platform, ''));
  v_min_version text;
  v_rec_version text;
  v_store_url text;
  v_maintenance boolean := false;
  v_maint_msg text := 'Trip Tracker is currently undergoing maintenance.';
  v_is_supported boolean := true;
  v_is_rec boolean := true;
begin
  -- Resolve platform-specific keys
  if v_plat = 'ios' then
    select coalesce(value #>> '{}', '1.0.0') into v_min_version from public.app_config where key = 'min_supported_version_ios';
    select coalesce(value #>> '{}', '1.0.0') into v_rec_version from public.app_config where key = 'recommended_version_ios';
    select coalesce(value #>> '{}', '') into v_store_url from public.app_config where key = 'store_url_ios';
  elsif v_plat = 'android' then
    select coalesce(value #>> '{}', '1.0.0') into v_min_version from public.app_config where key = 'min_supported_version_android';
    select coalesce(value #>> '{}', '1.0.0') into v_rec_version from public.app_config where key = 'recommended_version_android';
    select coalesce(value #>> '{}', '') into v_store_url from public.app_config where key = 'store_url_android';
  else
    v_min_version := '1.0.0';
    v_rec_version := '1.0.0';
    v_store_url := '';
  end if;

  select coalesce((value #>> '{}')::boolean, false) into v_maintenance from public.app_config where key = 'maintenance_mode';
  select coalesce(value #>> '{}', v_maint_msg) into v_maint_msg from public.app_config where key = 'maintenance_message';

  if p_version is not null and btrim(p_version) <> '' then
    if public.semver_compare(p_version, v_min_version) < 0 then
      v_is_supported := false;
    end if;
    if public.semver_compare(p_version, v_rec_version) < 0 then
      v_is_rec := false;
    end if;
  end if;

  return jsonb_build_object(
    'client', coalesce(p_client, 'flutter'),
    'platform', v_plat,
    'current_version', p_version,
    'min_supported_version', v_min_version,
    'recommended_version', v_rec_version,
    'store_url', v_store_url,
    'is_supported', v_is_supported,
    'is_recommended', v_is_rec,
    'upgrade_required', not v_is_supported,
    'maintenance_mode', v_maintenance,
    'maintenance_message', v_maint_msg
  );
end;
$$;

grant execute on function public.get_app_version_gate(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
