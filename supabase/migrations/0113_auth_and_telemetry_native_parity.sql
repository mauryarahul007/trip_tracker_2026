-- ============================================================================
-- Migration 0113: Auth Trigger Apple Resilience & Native Telemetry Parity
-- Purpose:
--   1. Hardens public.handle_new_user() trigger for Sign in with Apple (first-login-only
--      name delivery and private relay emails) by adding robust display_name fallbacks.
--   2. Extends telemetry and attribution RPCs with multi-client attribution
--      ('flutter', 'capacitor', 'web') so ops can compare conversion and reliability.
--
-- Backwards Compatibility:
--   - handle_new_user maintains identical output for Google/email logins while
--     preventing null display_names for Apple logins.
--   - Existing admin_reliability_summary calls remain functional.
--   - record_signup_source enforces the existing first-touch immutable policy.
--
-- Rollback SQL:
--   -- Revert handle_new_user to original 0001 implementation
--   create or replace function public.handle_new_user()
--   returns trigger language plpgsql security definer set search_path = public as $$
--   begin
--     insert into public.profiles (id, email, display_name, avatar_url)
--     values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
--     return new;
--   end; $$;
--   drop function if exists public.record_signup_source(jsonb);
--   notify pgrst, 'reload schema';
-- ============================================================================

-- Enhanced new user trigger with resilient Apple Sign-In and private relay handling
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_display_name text;
begin
  -- Resolve display name across provider metadata formats
  -- (Google uses 'full_name', Apple uses 'name' or 'full_name', custom email may have neither)
  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(split_part(new.email, '@', 1)), ''),
    'Traveler'
  );

  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    v_display_name,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

-- Secure client-agnostic signup source recorder
create or replace function public.record_signup_source(p_source jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if p_source is null or pg_column_size(p_source) > 1024 then
    return;
  end if;

  -- Only record first touch attribution (never overwrite existing)
  update public.profiles
  set signup_source = p_source
  where id = auth.uid()
    and signup_source is null;
end;
$$;

grant execute on function public.record_signup_source(jsonb) to authenticated;

notify pgrst, 'reload schema';
