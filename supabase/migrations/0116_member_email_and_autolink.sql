-- ============================================================================
-- Migration 0116: Member Email Field, Auto-Linking & Gmail Profile Lookup
--
-- Purpose:
--   1. Adds mandatory/optional `email` column to `public.members`.
--   2. Automatically links member records to `profiles.id` upon insert if
--      the user with that email already exists in `public.profiles`.
--   3. Automatically claims/links pending members when a new user signs up or
--      logs in with a matching Gmail address in `public.profiles`.
--   4. Provides `public.lookup_profile_by_email` RPC for frontend profile preview.
--
-- Backwards Compatibility:
--   100% additive. Existing members without an email remain valid.
-- ============================================================================

-- 1. Add email column to members
alter table public.members
  add column if not exists email text;

-- 2. Indexes for email lookups and trip-scoped uniqueness/querying
create index if not exists idx_members_email_lower on public.members (lower(email));
create index if not exists idx_members_trip_email on public.members (trip_id, lower(email));

-- 3. Trigger to autolink member on insert/update if profile already exists
create or replace function public.autolink_member_on_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_matched_id uuid;
begin
  if new.email is not null and btrim(new.email) <> '' and new.linked_user_id is null then
    select id into v_matched_id
    from public.profiles
    where lower(email) = lower(btrim(new.email))
    limit 1;

    if v_matched_id is not null then
      new.linked_user_id := v_matched_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_autolink_member_on_email on public.members;
create trigger trg_autolink_member_on_email
before insert or update on public.members
for each row
execute function public.autolink_member_on_email();

-- 4. Trigger to claim pending members whenever a profile is inserted or email updated
create or replace function public.claim_pending_members_for_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is not null and btrim(new.email) <> '' then
    update public.members
    set linked_user_id = new.id,
        updated_at = now()
    where lower(email) = lower(btrim(new.email))
      and linked_user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_claim_pending_members on public.profiles;
create trigger trg_claim_pending_members
after insert or update of email on public.profiles
for each row
execute function public.claim_pending_members_for_profile();

-- 5. Safe RPC to preview profile by email (returns basic display name and avatar)
create or replace function public.lookup_profile_by_email(p_email text)
returns table (
  id uuid,
  display_name text,
  avatar_url text
)
language plpgsql
security definer set search_path = public
as $$
begin
  if p_email is null or btrim(p_email) = '' then
    return;
  end if;

  return query
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where lower(p.email) = lower(btrim(p_email))
  limit 1;
end;
$$;

grant execute on function public.lookup_profile_by_email(text) to authenticated, anon;
