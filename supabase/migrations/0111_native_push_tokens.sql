-- ============================================================================
-- Migration 0111: Native Push Tokens Multi-Client Extension
-- Purpose:
--   Supports multi-client push notification registration (Capacitor, Flutter, Web)
--   with client attribution, app version tracking, and active token timestamping
--   (last_seen_at) to enable dual-install deduplication and stale token pruning.
--
-- Backwards Compatibility:
--   - New columns (client, app_version, last_seen_at) are nullable or defaulted.
--   - Existing Capacitor direct table upsert (user_id, platform, fcm_token)
--     continues to function without modification.
--   - Existing device_push_tokens rows remain valid.
--
-- Rollback SQL:
--   drop function if exists public.register_device_push_token(text, text, text, text);
--   drop index if exists public.device_push_tokens_user_last_seen_idx;
--   alter table public.device_push_tokens
--     drop column if exists client,
--     drop column if exists app_version,
--     drop column if exists last_seen_at;
--   notify pgrst, 'reload schema';
-- ============================================================================

alter table public.device_push_tokens
  add column if not exists client text check (client is null or client in ('capacitor', 'flutter', 'web')),
  add column if not exists app_version text,
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists device_push_tokens_user_last_seen_idx
  on public.device_push_tokens (user_id, last_seen_at desc);

-- Helper RPC for native and web clients to register or refresh push tokens
create or replace function public.register_device_push_token(
  p_fcm_token text,
  p_platform text,
  p_client text default 'flutter',
  p_app_version text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to register push tokens.';
  end if;

  if p_fcm_token is null or btrim(p_fcm_token) = '' then
    raise exception 'FCM token cannot be empty.';
  end if;

  if p_platform not in ('ios', 'android') then
    raise exception 'Invalid platform: must be ios or android.';
  end if;

  if p_client is not null and p_client not in ('capacitor', 'flutter', 'web') then
    raise exception 'Invalid client: must be capacitor, flutter, or web.';
  end if;

  insert into public.device_push_tokens (
    user_id,
    fcm_token,
    platform,
    client,
    app_version,
    last_seen_at,
    updated_at
  )
  values (
    auth.uid(),
    btrim(p_fcm_token),
    p_platform,
    coalesce(p_client, 'flutter'),
    p_app_version,
    now(),
    now()
  )
  on conflict (user_id, fcm_token) do update
  set
    platform = excluded.platform,
    client = coalesce(excluded.client, public.device_push_tokens.client),
    app_version = coalesce(excluded.app_version, public.device_push_tokens.app_version),
    last_seen_at = now(),
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.register_device_push_token(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
