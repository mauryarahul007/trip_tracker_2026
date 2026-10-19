-- ============================================================================
-- Trip Tracker 2026: Staging Environment Seed Dataset
--
-- Purpose:
--   Populates a dedicated staging Supabase database or local dev instance with
--   a complete, realistic multi-user environment for RLS testing, sync
--   validation, and native Flutter smoke-testing.
--
-- Test Users:
--   1. Owner:    owner@triptracker.test    (00000000-0000-0000-0000-000000000001)
--   2. Member:   member@triptracker.test   (00000000-0000-0000-0000-000000000002)
--   3. Outsider: outsider@triptracker.test (00000000-0000-0000-0000-000000000003)
-- ============================================================================

-- 1. Upsert Test Users in auth.users & public.profiles
insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'owner@triptracker.test',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rahul Maurya (Owner)"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'member@triptracker.test',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Priya Sharma (Member)"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'outsider@triptracker.test',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Vikram Singh (Outsider)"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  email_confirmed_at = now();

insert into public.profiles (id, display_name, email)
values
  ('00000000-0000-0000-0000-000000000001', 'Rahul Maurya', 'owner@triptracker.test'),
  ('00000000-0000-0000-0000-000000000002', 'Priya Sharma', 'member@triptracker.test'),
  ('00000000-0000-0000-0000-000000000003', 'Vikram Singh', 'outsider@triptracker.test')
on conflict (id) do update set
  display_name = excluded.display_name,
  email = excluded.email;

-- 2. Trips
-- Trip 1: Shared Active Trip (Owner: Rahul, Member: Priya, Amit)
insert into public.trips (
  id,
  name,
  start_date,
  end_date,
  base_currency,
  owner_id,
  join_code,
  destination,
  checklist,
  notes,
  passes,
  created_at,
  updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  'Goa Weekend Getaway 🏖️',
  '2026-11-10',
  '2026-11-15',
  'INR',
  '00000000-0000-0000-0000-000000000001',
  'GOA123',
  'North Goa, India',
  '[{"id":"c1","text":"Pack beachwear","completed":true},{"id":"c2","text":"Sunscreen SPF 50","completed":false}]'::jsonb,
  '[{"id":"n1","title":"Resort Check-in","body":"Taj Exotica booking confirmed under Rahul","updatedAt":1794278400000}]'::jsonb,
  '[{"id":"p1","type":"flight","passengerName":"Rahul Maurya","flightNumber":"6E-241","fromIata":"DEL","toIata":"GOI","date":"2026-11-10"}]'::jsonb,
  now() - interval '2 days',
  now() - interval '1 hour'
) on conflict (id) do nothing;

-- Trip 2: Single-member Himalayan Trek (Owner: Rahul)
insert into public.trips (
  id,
  name,
  start_date,
  end_date,
  base_currency,
  owner_id,
  join_code,
  destination,
  created_at,
  updated_at
) values (
  '11111111-1111-1111-1111-111111111112',
  'Himalayan Solo Trek 🏔️',
  '2026-12-01',
  '2026-12-08',
  'INR',
  '00000000-0000-0000-0000-000000000001',
  'HIM456',
  'Manali, India',
  now() - interval '5 days',
  now() - interval '3 days'
) on conflict (id) do nothing;

-- Trip 3: Outsider Isolated Trip (Owner: Vikram, non-shared)
insert into public.trips (
  id,
  name,
  start_date,
  end_date,
  base_currency,
  owner_id,
  join_code,
  destination,
  created_at,
  updated_at
) values (
  '11111111-1111-1111-1111-111111111113',
  'Outsider Secret Trip 🔒',
  '2026-10-20',
  '2026-10-25',
  'USD',
  '00000000-0000-0000-0000-000000000003',
  'SEC789',
  'San Francisco, CA',
  now() - interval '1 day',
  now()
) on conflict (id) do nothing;

-- 3. Members for Trip 1
insert into public.members (id, trip_id, name, linked_user_id, created_at, updated_at) values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Rahul Maurya', '00000000-0000-0000-0000-000000000001', now() - interval '2 days', now() - interval '2 days'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Priya Sharma', '00000000-0000-0000-0000-000000000002', now() - interval '2 days', now() - interval '2 days'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Amit Patel', null, now() - interval '2 days', now() - interval '2 days')
on conflict (id) do nothing;

-- Members for Trip 2
insert into public.members (id, trip_id, name, linked_user_id, created_at, updated_at) values
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111112', 'Rahul Maurya', '00000000-0000-0000-0000-000000000001', now() - interval '5 days', now() - interval '5 days')
on conflict (id) do nothing;

-- Members for Trip 3
insert into public.members (id, trip_id, name, linked_user_id, created_at, updated_at) values
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111113', 'Vikram Singh', '00000000-0000-0000-0000-000000000003', now() - interval '1 day', now())
on conflict (id) do nothing;

-- 4. Groups & Group Members
insert into public.groups (id, trip_id, name, created_at, updated_at) values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Roomies', now() - interval '2 days', now()),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Beach Squad', now() - interval '2 days', now())
on conflict (id) do nothing;

insert into public.group_members (group_id, member_id) values
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221'),
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222221'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222223')
on conflict (group_id, member_id) do nothing;

-- 5. Categories
insert into public.categories (id, trip_id, name, icon, is_custom, created_at, updated_at) values
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Food & Dining', 'Utensils', false, now() - interval '2 days', now()),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'Beach Activities', 'Waves', true, now() - interval '2 days', now())
on conflict (id) do nothing;

-- 6. Comprehensive Expense Dataset (Covering All Split Modes, Multi-Payer, Disputes & Tombstones)

-- Expense 1: Equal Split
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, resolved_shares, is_settlement, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555551',
  '11111111-1111-1111-1111-111111111111',
  'Seafood Dinner at Thalassa 🦞',
  3000.00, 'INR', 'Food & Dining', '2026-11-10',
  '22222222-2222-2222-2222-222222222221',
  'equal',
  array['22222222-2222-2222-2222-222222222221'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, '22222222-2222-2222-2222-222222222223'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 1000, "22222222-2222-2222-2222-222222222222": 1000, "22222222-2222-2222-2222-222222222223": 1000}'::jsonb,
  false, 'confirmed', '00000000-0000-0000-0000-000000000001',
  now() - interval '2 days', now() - interval '2 days'
) on conflict (id) do nothing;

-- Expense 2: Custom Weights Split
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, split_config, resolved_shares, is_settlement, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555552',
  '11111111-1111-1111-1111-111111111111',
  'Villa Rental 🏡',
  10000.00, 'INR', 'Stay', '2026-11-10',
  '22222222-2222-2222-2222-222222222222',
  'custom',
  array['22222222-2222-2222-2222-222222222221'::uuid, '22222222-2222-2222-2222-222222222222'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 2, "22222222-2222-2222-2222-222222222222": 1}'::jsonb,
  '{"22222222-2222-2222-2222-222222222221": 6666.67, "22222222-2222-2222-2222-222222222222": 3333.33}'::jsonb,
  false, 'confirmed', '00000000-0000-0000-0000-000000000002',
  now() - interval '1 day', now() - interval '1 day'
) on conflict (id) do nothing;

-- Expense 3: Exact Split
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, split_config, resolved_shares, is_settlement, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555553',
  '11111111-1111-1111-1111-111111111111',
  'Scooter Fuel ⛽',
  1500.00, 'INR', 'Travel', '2026-11-11',
  '22222222-2222-2222-2222-222222222221',
  'exact',
  array['22222222-2222-2222-2222-222222222221'::uuid, '22222222-2222-2222-2222-222222222223'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 1000, "22222222-2222-2222-2222-222222222223": 500}'::jsonb,
  '{"22222222-2222-2222-2222-222222222221": 1000, "22222222-2222-2222-2222-222222222223": 500}'::jsonb,
  false, 'confirmed', '00000000-0000-0000-0000-000000000001',
  now() - interval '12 hours', now() - interval '12 hours'
) on conflict (id) do nothing;

-- Expense 4: Percentage Split
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, split_config, resolved_shares, is_settlement, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555554',
  '11111111-1111-1111-1111-111111111111',
  'Scuba Diving Adventure 🤿',
  6000.00, 'INR', 'Beach Activities', '2026-11-11',
  '22222222-2222-2222-2222-222222222221',
  'percentage',
  array['22222222-2222-2222-2222-222222222221'::uuid, '22222222-2222-2222-2222-222222222222'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 60, "22222222-2222-2222-2222-222222222222": 40}'::jsonb,
  '{"22222222-2222-2222-2222-222222222221": 3600, "22222222-2222-2222-2222-222222222222": 2400}'::jsonb,
  false, 'confirmed', '00000000-0000-0000-0000-000000000001',
  now() - interval '6 hours', now() - interval '6 hours'
) on conflict (id) do nothing;

-- Expense 5: Multi-Payer Split (Migration 0104)
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by, paid_by_shares,
  split_mode, split_member_ids, resolved_shares, is_settlement, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Yacht Sunset Cruise ⛵',
  12000.00, 'INR', 'Beach Activities', '2026-11-12',
  '22222222-2222-2222-2222-222222222221',
  '{"22222222-2222-2222-2222-222222222221": 7000, "22222222-2222-2222-2222-222222222222": 5000}'::jsonb,
  'equal',
  array['22222222-2222-2222-2222-222222222221'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, '22222222-2222-2222-2222-222222222223'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 4000, "22222222-2222-2222-2222-222222222222": 4000, "22222222-2222-2222-2222-222222222223": 4000}'::jsonb,
  false, 'confirmed', '00000000-0000-0000-0000-000000000001',
  now() - interval '4 hours', now() - interval '4 hours'
) on conflict (id) do nothing;

-- Expense 6: Confirmed Settlement (Migration 0099)
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, resolved_shares, is_settlement,
  settlement_confirmed_at, settlement_confirmed_by_user_id, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555556',
  '11111111-1111-1111-1111-111111111111',
  'Settlement: Priya ➔ Rahul',
  2500.00, 'INR', 'Misc', '2026-11-12',
  '22222222-2222-2222-2222-222222222222',
  'exact',
  array['22222222-2222-2222-2222-222222222221'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 2500}'::jsonb,
  true,
  now() - interval '2 hours', '00000000-0000-0000-0000-000000000001', 'confirmed',
  '00000000-0000-0000-0000-000000000002',
  now() - interval '3 hours', now() - interval '2 hours'
) on conflict (id) do nothing;

-- Expense 7: Disputed Expense (Migration 0085)
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, resolved_shares, is_settlement,
  disputed_at, disputed_by_user_id, dispute_note, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555557',
  '11111111-1111-1111-1111-111111111111',
  'Late Night Cocktails 🍹',
  4500.00, 'INR', 'Food & Dining', '2026-11-11',
  '22222222-2222-2222-2222-222222222221',
  'equal',
  array['22222222-2222-2222-2222-222222222221'::uuid, '22222222-2222-2222-2222-222222222222'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 2250, "22222222-2222-2222-2222-222222222222": 2250}'::jsonb,
  false,
  now() - interval '1 hour', '00000000-0000-0000-0000-000000000002', 'I left early at 10 PM before cocktails were ordered', 'confirmed',
  '00000000-0000-0000-0000-000000000001',
  now() - interval '5 hours', now() - interval '1 hour'
) on conflict (id) do nothing;

-- Expense 8: Soft-Deleted Expense in Recycle Bin (Migration 0041)
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, resolved_shares, is_settlement, approval_status,
  created_by_user_id, deleted_at, deleted_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555558',
  '11111111-1111-1111-1111-111111111111',
  'Duplicate Parking Receipt 🅿️',
  200.00, 'INR', 'Travel', '2026-11-10',
  '22222222-2222-2222-2222-222222222221',
  'equal',
  array['22222222-2222-2222-2222-222222222221'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 200}'::jsonb,
  false, 'confirmed', '00000000-0000-0000-0000-000000000001',
  now() - interval '30 minutes', '00000000-0000-0000-0000-000000000001',
  now() - interval '1 day', now() - interval '30 minutes'
) on conflict (id) do nothing;

-- Expense 9: Pending Approval Threshold Expense (Migration 0100)
insert into public.expenses (
  id, trip_id, title, amount, currency, category, date, paid_by,
  split_mode, split_member_ids, resolved_shares, is_settlement, approval_status,
  created_by_user_id, created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555559',
  '11111111-1111-1111-1111-111111111111',
  'Scuba Gear Purchase 🤿',
  25000.00, 'INR', 'Activities', '2026-11-12',
  '22222222-2222-2222-2222-222222222221',
  'equal',
  array['22222222-2222-2222-2222-222222222221'::uuid, '22222222-2222-2222-2222-222222222222'::uuid],
  '{"22222222-2222-2222-2222-222222222221": 12500, "22222222-2222-2222-2222-222222222222": 12500}'::jsonb,
  false, 'pending_approval',
  '00000000-0000-0000-0000-000000000001',
  now() - interval '15 minutes', now() - interval '15 minutes'
) on conflict (id) do nothing;

-- 7. Chat Messages for Trip 1 (Migration 0082, 0083, 0094)
insert into public.trip_messages (
  id, trip_id, member_id, body, event_kind, created_at
) values
  (
    '66666666-6666-6666-6666-666666666661',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'Welcome to Goa team! Let us add expenses as they happen.',
    null,
    now() - interval '2 days'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Sounds great, I paid for the villa deposit.',
    null,
    now() - interval '1 day'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'Added Seafood Dinner (₹3,000)',
    'expense_added',
    now() - interval '20 hours'
  )
on conflict (id) do nothing;

-- 8. Notifications for Priya (Member)
insert into public.notifications (
  id, user_id, trip_id, type, title, body, created_at
) values
  (
    '77777777-7777-7777-7777-777777777771',
    '00000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'expense_added',
    'Dinner added in Goa',
    'Rahul added Seafood Dinner (₹3,000)',
    now() - interval '20 hours'
  )
on conflict (id) do nothing;
