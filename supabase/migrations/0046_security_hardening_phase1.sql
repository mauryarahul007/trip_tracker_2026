-- ============================================================================
-- Migration 0046: Security Hardening Phase 1 (Anti-DDoS & Storage Protections)
-- ============================================================================

-- 1. Hardened Storage Bucket Settings for 'receipts'
-- Restricts upload file size to 5MB (5,242,880 bytes) and enforces image-only MIME types
-- to prevent storage exhaustion attacks and non-image payload uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- 2. Storage Objects RLS Policies for 'receipts'
-- Ensure full CRUD policies exist and are tightly bound to trip participants/admins.
drop policy if exists "trip participants can read receipts" on storage.objects;
create policy "trip participants can read receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "trip participants can upload receipts" on storage.objects;
create policy "trip participants can upload receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "trip participants can update receipts" on storage.objects;
create policy "trip participants can update receipts"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'receipts'
    and public.is_trip_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "trip participants can delete receipts" on storage.objects;
create policy "trip participants can delete receipts"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and (
      public.is_trip_admin(((storage.foldername(name))[1])::uuid)
      or public.is_trip_participant(((storage.foldername(name))[1])::uuid)
    )
  );

-- 3. Prevent Query-based Slow DDoS (Statement Timeouts)
-- Hardens PostgreSQL connection roles against runaway or malicious nested queries.
alter role authenticated set statement_timeout = '5000ms';
alter role anon set statement_timeout = '3000ms';

-- 4. Re-assert RLS on all public tables
alter table if exists public.profiles enable row level security;
alter table if exists public.trips enable row level security;
alter table if exists public.members enable row level security;
alter table if exists public.groups enable row level security;
alter table if exists public.group_members enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.expenses enable row level security;
alter table if exists public.device_push_tokens enable row level security;

-- 5. Revoke destructive permissions from anon role on application tables
revoke insert, update, delete on public.trips from anon;
revoke insert, update, delete on public.members from anon;
revoke insert, update, delete on public.groups from anon;
revoke insert, update, delete on public.group_members from anon;
revoke insert, update, delete on public.categories from anon;
revoke insert, update, delete on public.expenses from anon;
revoke insert, update, delete on public.profiles from anon;
revoke insert, update, delete on public.device_push_tokens from anon;

notify pgrst, 'reload schema';

