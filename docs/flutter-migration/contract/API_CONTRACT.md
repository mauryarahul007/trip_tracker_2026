# Trip Tracker API & Backend Contract
**Version:** 1.0.0 (Frozen for Flutter Migration)  
**Date:** 2026-10-06  
**Status:** Frozen Baseline  

This document specifies the exact contract between client applications (React web and Flutter mobile) and the Supabase backend. All Flutter data models, Drift tables, repositories, and RPC clients must conform strictly to this specification.

---

## 1. Primary Key & ID Generation Strategy

- **Format:** All entity primary keys are **RFC 4122 UUID v4** strings (e.g. `550e8400-e29b-41d4-a716-446655440000`).
- **Generation:** Primary keys are **generated on the client** prior to network dispatch using `crypto.randomUUID()` (fallback to cryptographic pseudo-random bytes).
- **Offline / Outbox Parity:** Because IDs are generated client-side:
  1. Optimistic UI items and offline database entries use their permanent ID immediately.
  2. The offline outbox queues inserts using this client ID.
  3. No temporary-to-permanent ID reconciliation or foreign key cascades are needed when syncing with Supabase.
- **Server Defaults:** All table schemas specify `id uuid primary key default gen_random_uuid()` to allow server-side fallback if an ID is omitted.

---

## 2. Table Schemas & Field Mappings

### 2.1 `profiles`
Public profile information linked 1:1 with `auth.users(id)`.

| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) | Notes |
|---|---|---|---|---|---|---|
| `id` | `uuid` | No | None | PK -> `auth.users(id)` | `id` | Matches authenticated user ID |
| `email` | `text` | No | None | Unique | `email` | User email address |
| `display_name` | `text` | Yes | `null` | | `displayName` | User profile name |
| `avatar_url` | `text` | Yes | `null` | | `avatarUrl` | Gravatar or uploaded image URL |
| `banned` | `boolean` | No | `false` | | `banned` | Admin ban killswitch |
| `created_at` | `timestamptz` | No | `now()` | | `createdAt` | ISO 8601 string |
| `signup_source` | `jsonb` | Yes | `null` | | `signupSource` | UTM attribution metadata |

### 2.2 `trips`
Core trip entity managing travel duration, participants, and settings.

| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) | Notes |
|---|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | `id` | Client-generated UUID |
| `name` | `text` | No | None | Length >= 1 | `name` | Trip display title |
| `start_date` | `date` | No | None | | `startDate` | YYYY-MM-DD |
| `end_date` | `date` | No | None | >= `start_date` | `endDate` | YYYY-MM-DD |
| `base_currency` | `text` | No | `'USD'` | 3-char code | `baseCurrency` | ISO 4217 currency code |
| `owner_id` | `uuid` | No | None | FK -> `profiles(id)` | `ownerId` | Trip creator user ID |
| `join_code` | `text` | No | None | Unique, 6 chars | `joinCode` | Uppercase alphanumeric |
| `archived` | `boolean` | No | `false` | | `archived` | Soft-archived state |
| `frozen` | `boolean` | No | `false` | | `frozen` | Read-only mode flag |
| `closed` | `boolean` | No | `false` | | `closed` | Finalized / settled flag |
| `destination` | `text` | Yes | `null` | | `destination` | Free-text city or country |
| `stops` | `jsonb` | No | `'[]'::jsonb` | | `stops` | Array of itinerary stops |
| `checklist` | `jsonb` | No | `'[]'::jsonb` | | `checklist` | Array of checklist items |
| `notes` | `jsonb` | No | `'[]'::jsonb` | | `notes` | Array of collaborative notes |
| `passes` | `jsonb` | No | `'[]'::jsonb` | | `passes` | Travel passes / tickets |
| `fx_config` | `jsonb` | Yes | `null` | | `fxConfig` | Custom currency exchange rates |
| `member_roles` | `jsonb` | Yes | `'{}'::jsonb` | | `memberRoles` | Map `{ [memberId]: role }` |
| `split_exclusion_defaults` | `jsonb` | Yes | `'{}'::jsonb` | | `splitExclusionDefaults` | Map `{ [payerMemberId]: excludedMemberIds[] }` |
| `category_order` | `text[]`| Yes | `null` | | `categoryOrder` | Custom order of category IDs |
| `share_token` | `uuid` | Yes | `null` | Unique | `shareToken` | Public web view token |
| `share_enabled` | `boolean`| No | `false` | | `shareEnabled` | Whether public share link works |
| `share_expires_at`| `timestamptz` | Yes | `null` | | `shareExpiresAt` | Share link expiration timestamp |
| `share_view_count` | `integer` | No | `0` | >= 0 | `shareViewCount` | Public view counter |
| `closeout_pulse` | `text` | Yes | `null` | | `closeoutPulse` | Post-trip mood indicator |
| `closeout_pulse_at`| `timestamptz` | Yes | `null` | | `closeoutPulseAt` | Timestamp of closeout pulse |
| `splitwise_imported_at`| `timestamptz` | Yes | `null` | | `splitwiseImportedAt` | Splitwise import timestamp |
| `splitwise_import_count`| `integer` | Yes | `null` | | `splitwiseImportCount` | Count of imported expenses |
| `approval_threshold` | `numeric` | Yes | `null` | | `approvalThreshold` | Threshold requiring approvals |
| `created_at` | `timestamptz` | No | `now()` | | `createdAt` | ISO 8601 string |

### 2.3 `members`
Participants in a trip, either unclaimed or claimed by a registered user.

| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) | Notes |
|---|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | `id` | Client-generated UUID |
| `trip_id` | `uuid` | No | None | FK -> `trips(id)` ON DELETE CASCADE | `tripId` | Parent trip ID |
| `name` | `text` | No | None | Length >= 1 | `name` | Participant display name |
| `linked_user_id`| `uuid` | Yes | `null` | FK -> `profiles(id)` | `linkedUserId` | Supabase user ID if claimed |
| `archived` | `boolean` | No | `false` | | `archived` | Excluded from future splits |
| `join_date` | `date` | Yes | `null` | | `joinDate` | Membership start date |
| `leave_date` | `date` | Yes | `null` | | `leaveDate` | Membership end date |
| `created_at` | `timestamptz` | No | `now()` | | `createdAt` | ISO 8601 string |

### 2.4 `expenses`
Financial transactions and settlement payments within a trip. **Column names verified against `src/types/database.ts` and `mapExpense()` in `src/services/tripApi.ts` (corrected in Phase 5; earlier drafts of this table used wrong names).** Soft delete is `deleted_at` (24 h recycle bin), not `archived`.

| Column | SQL Type | Null | App Field | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `id` | Client-generated UUID (PK) |
| `trip_id` | `uuid` | No | `tripId` | FK -> `trips(id)` ON DELETE CASCADE |
| `title` | `text` | No | `title` | |
| `amount` | `numeric` | No | `amount` | > 0; arrives as number |
| `currency` | `text` | No | `currency` | 3-char code |
| `category` | `text` | No | `category` | Built-in name or custom category UUID |
| `date` | `date` | No | `date` | YYYY-MM-DD |
| `paid_by` | `uuid` | No | `paidBy` | Primary payer member id |
| `paid_by_shares` | `jsonb` | Yes | `paidByShares` | Multi-payer map `{memberId: amount}` |
| `split_mode` | `text` | No | `splitMode` | `equal\|equalUnit\|custom\|exact\|percentage\|itemized` |
| `split_member_ids` | `uuid[]` | No | `splitMemberIds` | |
| `split_config` | `jsonb` | Yes | `splitConfig` | Mode-specific weights |
| `itemized_config` | `jsonb` | Yes | `itemizedConfig` | Itemized receipt |
| `resolved_shares` | `jsonb` | No | `resolvedShares` | `{memberId: amount}` summing to `amount` |
| `receipt_path` | `text` | Yes | `receiptPath` | Storage key `{tripId}/{expenseId}.{ext}` |
| `photo_paths` | `text[]` | Yes | `photoPaths` | |
| `is_settlement` | `boolean` | No | `isSettlement` | True for settlement transfers (title starts `Settlement:`) |
| `settlement_confirmed_at` | `timestamptz` | Yes | `settlementConfirmedAt` (ms) | |
| `settlement_confirmed_by_user_id` | `uuid` | Yes | `settlementConfirmedByUserId` | |
| `disputed_at` | `timestamptz` | Yes | `disputedAt` (ms) | Non-null = flagged |
| `disputed_by_user_id` | `uuid` | Yes | `disputedByUserId` | |
| `dispute_note` | `text` | Yes | `disputeNote` | |
| `approval_status` | `text` | No | `approvalStatus` | `confirmed\|pending_approval` |
| `approved_by_user_id` | `uuid` | Yes | `approvedByUserId` | |
| `created_by_user_id` | `uuid` | Yes | `createdByUserId` | |
| `location` | `jsonb` | Yes | `location` | `{lat, lng}` only; place names are client-side |
| `deleted_at` | `timestamptz` | Yes | `deletedAt` (ms) | Soft delete / recycle bin |
| `deleted_by_user_id` | `uuid` | Yes | `deletedByUserId` | |
| `created_at` / `updated_at` | `timestamptz` | No | `createdAt` / `updatedAt` (ms) | `updated_at` auto-set by trigger (0114) |

### 2.5 `categories`
Trip-specific custom expense categories.

| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) | Notes |
|---|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | `id` | Custom category UUID |
| `trip_id` | `uuid` | No | None | FK -> `trips(id)` ON DELETE CASCADE | `tripId` | Parent trip ID |
| `name` | `text` | No | None | | `name` | Category title |
| `icon` | `text` | Yes | `null` | | `icon` | Lucide icon name or emoji |
| `is_custom` | `boolean` | No | `true` | | `isCustom` | Always true for DB rows |
| `created_at` | `timestamptz` | No | `now()` | | `createdAt` | Creation timestamp |
| `updated_at` | `timestamptz` | No | `now()` | | `updatedAt` | Auto-updated via trigger (Migration 0114) |

### 2.6 `groups` and `group_members`
Member groupings for bulk split selections.

**`groups`**:
| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | `id` |
| `trip_id` | `uuid` | No | None | FK -> `trips(id)` ON DELETE CASCADE | `tripId` |
| `name` | `text` | No | None | | `name` |
| `created_at` | `timestamptz` | No | `now()` | | `createdAt` |

**`group_members`**:
| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) |
|---|---|---|---|---|---|
| `group_id` | `uuid` | No | None | FK -> `groups(id)` ON DELETE CASCADE | `groupId` |
| `member_id`| `uuid` | No | None | FK -> `members(id)` ON DELETE CASCADE | `memberId` |
| Primary Key: `(group_id, member_id)` | | | | | |

### 2.7 `trip_messages`
Realtime trip chat messages, system cards, and media attachments. **Column names verified against `src/types/database.ts` / `mapTripMessage()` (corrected in Phase 5).**

| Column | SQL Type | Null | App Field | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `id` | Client-generated UUID |
| `trip_id` | `uuid` | No | `tripId` | FK -> `trips(id)` ON DELETE CASCADE |
| `member_id` | `uuid` | No | `memberId` | Author member |
| `body` | `text` | No | `body` | <= 2000 chars |
| `kind` | `text` | No | `eventKind` | See kinds below |
| `payload` | `jsonb` | Yes | `payload` | Kind-specific payload (not `metadata`) |
| `created_at` | `timestamptz` | No | `createdAt` (ms) | |
| `edited_at` | `timestamptz` | Yes | `editedAt` (ms) | |
| `deleted_at` | `timestamptz` | Yes | `deletedAt` (ms) | Soft delete |
| `reply_to_id` | `uuid` | Yes | `replyToId` | |
| `reactions` | `jsonb` | Yes | `reactions` | `{emoji: [memberId]}` |
| `is_pinned` | `boolean` | Yes | `isPinned` | |

*Allowed `kind` values:* `'text'`, `'expense_added'`, `'settlement_recorded'`, `'expense_disputed'`, `'expense_dispute_resolved'`, `'image'`, `'expense_link'`, `'voice_note'`.

### 2.8 `trip_chat_read_cursors`
Tracks the latest message seen by a member for unread badges and read receipts.

| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) |
|---|---|---|---|---|---|
| `trip_id` | `uuid` | No | None | FK -> `trips(id)` ON DELETE CASCADE | `tripId` |
| `member_id` | `uuid` | No | None | FK -> `members(id)` ON DELETE CASCADE | `memberId` |
| `last_read_at` | `timestamptz` | No | `now()` | | `lastReadAt` |
| `last_message_id` | `uuid` | Yes | `null` | FK -> `trip_messages(id)` | `lastMessageId` |
| `updated_at` | `timestamptz` | No | `now()` | | `updatedAt` |
| Primary Key: `(trip_id, member_id)` | | | | | |

### 2.9 `trip_collab_signals`
Signals optimistic mutations across collaboration clients to trigger silent background refetches.

| Column | SQL Type | Nullable | Default | FK / Constraint | Notes |
|---|---|---|---|---|---|
| `trip_id` | `uuid` | No | None | PK -> `trips(id)` ON DELETE CASCADE | Target trip |
| `last_signal` | `text` | No | None | | Mutation name (`expense_added`, etc.) |
| `last_member_id` | `uuid` | Yes | `null` | | Mutating member |
| `updated_at` | `timestamptz` | No | `now()` | | Realtime change trigger |

### 2.10 `member_locations`
Temporary live location coordinates shared during a trip.

| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) | Notes |
|---|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | `id` |
| `trip_id` | `uuid` | No | None | FK -> `trips(id)` ON DELETE CASCADE | `tripId` |
| `member_id` | `uuid` | No | None | FK -> `members(id)` ON DELETE CASCADE | `memberId` |
| `latitude` | `double precision` | No | None | Between -90 and 90 | `latitude` |
| `longitude` | `double precision` | No | None | Between -180 and 180 | `longitude` |
| `share_token`| `uuid` | No | `gen_random_uuid()`| Unique | `shareToken` | Public share token |
| `expires_at` | `timestamptz` | No | None | | `expiresAt` | Auto-expires (e.g. 8h) |
| `updated_at` | `timestamptz` | No | `now()` | | `updatedAt` | Heartbeat timestamp |

### 2.11 `device_push_tokens`
Registered device tokens for Firebase Cloud Messaging (FCM HTTP v1).

| Column | SQL Type | Nullable | Default | FK / Constraint | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | |
| `user_id` | `uuid` | No | None | FK -> `profiles(id)` ON DELETE CASCADE | Registered user |
| `platform` | `text` | No | None | Check `'ios'\|'android'` | Client platform |
| `client` | `text` | Yes | `null` | Check `'capacitor'\|'flutter'\|'web'` | Client framework (Migration 0111) |
| `app_version` | `text` | Yes | `null` | None | Semver app version string (Migration 0111) |
| `fcm_token` | `text` | No | None | Unique | FCM device registration token |
| `last_seen_at` | `timestamptz` | No | `now()` | Index with `user_id` | Timestamp of last active send (Migration 0111) |
| `created_at` | `timestamptz` | No | `now()` | | Token creation date |

### 2.12 `notifications`
In-app notification records rendered in the notification panel.

| Column | SQL Type | Nullable | Default | FK / Constraint | App Field (camelCase) | Notes |
|---|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | `id` | Client-generated UUID |
| `user_id` | `uuid` | No | None | FK -> `profiles(id)` ON DELETE CASCADE | `userId` | Recipient user |
| `trip_id` | `uuid` | Yes | `null` | FK -> `trips(id)` ON DELETE SET NULL | `tripId` | Context trip ID |
| `title` | `text` | No | None | | `title` | Trip name or 'Trip Tracker' |
| `body` | `text` | Yes | `null` | | `body` | Usually null; rendered client-side |
| `read` | `boolean` | No | `false` | | `read` | Read / unread status |
| `data` | `jsonb` | No | `'{}'::jsonb` | | `data` | Contains `{ type, ...params }` |
| `created_at` | `timestamptz` | No | `now()` | | `createdAt` | ISO 8601 string |

### 2.13 `trip_mutes`
Per-user trip push notification mutes.

| Column | SQL Type | Nullable | Default | FK / Constraint | Notes |
|---|---|---|---|---|---|
| `user_id` | `uuid` | No | None | FK -> `profiles(id)` ON DELETE CASCADE | User who muted |
| `trip_id` | `uuid` | No | None | FK -> `trips(id)` ON DELETE CASCADE | Muted trip |
| `created_at` | `timestamptz` | No | `now()` | |
| Primary Key: `(user_id, trip_id)` | | | | | |

### 2.14 `quiet_hours_prefs` and `notification_digest_prefs`
User preferences for notification delivery suppression.

**`quiet_hours_prefs`**:
- Columns: `user_id` (PK -> `profiles`), `enabled` (boolean), `start_time` (text "HH:MM"), `end_time` (text "HH:MM"), `timezone` (text, e.g. "Asia/Kolkata"), `updated_at` (timestamptz).

**`notification_digest_prefs`**:
- Columns: `user_id` (PK -> `profiles`), `enabled` (boolean), `delivery_time` (text "HH:MM"), `updated_at` (timestamptz).

**`pending_digest_events`**:
- Columns: `id` (uuid PK), `user_id` (uuid FK), `trip_id` (uuid FK), `trip_name` (text), `type` (text), `params` (jsonb), `created_at` (timestamptz).

### 2.15 `bugs` and `features`
User-submitted bug diagnostics and feature suggestions.

**`bugs`**:
- Columns: `id` (text PK), `title` (text), `description` (text), `severity` (text), `category` (text), `found_by` (text), `user_id` (uuid FK), `environment` (jsonb), `repro_steps` (text[]), `expected_behavior` (text), `actual_behavior` (text), `diagnostics` (jsonb), `fingerprint` (text), `status` (text default 'open'), `created_at` (timestamptz), `updated_at` (timestamptz).

**`features`**:
- Columns: `id` (uuid PK), `title` (text), `description` (text), `category` (text), `requested_by` (text), `user_id` (uuid FK), `environment` (jsonb), `status` (text default 'pending'), `created_at` (timestamptz).

### 2.16 `feature_flag_overrides` and `app_config`
Remote flag evaluation and configuration storage.

**`feature_flag_overrides`**:
- Columns: `scope` (text 'user'|'trip'), `scope_id` (text), `flag_key` (text), `value` (boolean), `updated_at` (timestamptz). Primary Key: `(scope, scope_id, flag_key)`.

**`app_config`**:
- Columns: `key` (text PK), `value` (jsonb), `updated_at` (timestamptz).

### 2.17 `security_audit_logs` and `app_events`
Audit trails and telemetry tracking.

**`security_audit_logs`**:
- Columns: `id` (uuid PK), `user_id` (uuid FK), `trip_id` (uuid FK), `action` (text), `details` (jsonb), `created_at` (timestamptz).

**`app_events`**:
- Columns: `id` (uuid PK), `user_id` (uuid FK), `event` (text), `platform` (text), `app_version` (text), `payload` (jsonb), `created_at` (timestamptz).

---

## 3. Row Level Security (RLS) Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Authenticated users (public data) | System trigger / Authenticated self | Authenticated self (`auth.uid() = id`) | Disallowed directly (use RPC) |
| `trips` | Trip participants or owner | Authenticated user (`owner_id = auth.uid()`) | Trip participants (if not closed/frozen) | Trip owner or superadmin |
| `members` | Trip participants | Trip admin or self | Trip admin or self linked | Trip admin or self (if not in expenses) |
| `expenses` | Trip participants | Trip participants (if not closed/frozen) | Trip participants (if not closed/frozen) | Trip admin or author |
| `categories` | Trip participants | Trip participants | Trip participants | Trip participants |
| `groups` | Trip participants | Trip participants | Trip participants | Trip participants |
| `group_members`| Trip participants | Trip participants | Trip participants | Trip participants |
| `trip_messages`| Trip participants | Trip participants | Message author (within edit window) | Message author or trip admin |
| `trip_chat_read_cursors` | Trip participants | Authenticated self member | Authenticated self member | Trip participants |
| `trip_collab_signals` | Trip participants | Trip participants | Trip participants | Disallowed |
| `member_locations` | Trip participants | Authenticated self member | Authenticated self member | Self or expired cleanup |
| `device_push_tokens` | Authenticated self | Authenticated self | Authenticated self | Authenticated self or Edge Function |
| `notifications` | Authenticated recipient | Edge function (service role) | Authenticated recipient | Authenticated recipient |
| `trip_mutes` | Authenticated self | Authenticated self | Authenticated self | Authenticated self |
| `quiet_hours_prefs` | Authenticated self | Authenticated self | Authenticated self | Authenticated self |
| `notification_digest_prefs` | Authenticated self | Authenticated self | Authenticated self | Authenticated self |
| `bugs` | Authenticated author or superadmin | Authenticated user | Superadmin only | Superadmin only |
| `features` | Authenticated author or superadmin | Authenticated user | Superadmin only | Superadmin only |
| `storage.objects (receipts)` | Trip participants | Trip participants | Trip participants | Trip admin or participant |
| `storage.objects (chat-media)` | Trip participants | Trip participants | Trip participants | Trip admin or participant |

### SECURITY DEFINER RPCs (RLS Bypass Functions)
The following RPCs execute with elevated `security definer` rights to provide safe, isolated bypasses:
1. `preview_trip_by_join_code`: Allows unauthenticated users to preview trip title, dates, and member first names without exposing full trip details.
2. `lookup_trip_by_join_code`: Validates code and checks participant membership during join flow.
3. `claim_trip_member`: Atomically links `auth.uid()` to an unclaimed member row.
4. `get_trip_share`: Allows read-only access to summarized trip totals for holders of a valid `share_token`.
5. `get_shared_location`: Allows location lookup for holders of a valid `location_token`.
6. `confirm_settlement`: Verifies payee identity and updates confirmation state.
7. `approve_expense`: Verifies member permissions and sets approval status.
8. `flag_expense_dispute` & `resolve_expense_dispute`: Manages dispute states with audit trail.
9. `set_trip_collab_field`: Updates collaborative JSON fields (checklist, notes, passes) safely.
10. `delete_own_account`: Cascades deletion of all user data and anonymizes historical expenses.

---

## 4. Complete Client RPC Catalogue

| RPC Name | Arguments | Return Type | Auth | Idempotent | Notes / Error Codes |
|---|---|---|---|---|---|
| `preview_trip_by_join_code` | `p_code text` | `table(trip_name, start_date, end_date, member_first_names)` | Anon / Auth | Yes | Returns 0 rows if code invalid |
| `lookup_trip_by_join_code` | `p_code text` | `table(trip_id, trip_name, is_admin, my_member_id, member_id, member_name)` | Authenticated | Yes | Rate-limited (10/min) |
| `claim_trip_member` | `p_member_id uuid` | `boolean` | Authenticated | Yes | Returns true on success |
| `get_trip_share` | `p_token uuid` | `table(trip_name, start_date, end_date, destination, member_count, expense_count, spend_by_currency)` | Anon / Auth | Yes | Empty if expired/disabled |
| `record_trip_share_view` | `p_token uuid` | `integer` | Anon / Auth | Yes | Increments view counter |
| `get_shared_location` | `p_token uuid` | `table(member_name, trip_name, lat, lng, updated_at, expires_at)` | Anon / Auth | Yes | Empty if expired |
| `confirm_settlement` | `p_expense_id uuid` | `public.expenses` | Authenticated | Yes | Verifies caller is payee |
| `approve_expense` | `p_expense_id uuid` | `public.expenses` | Authenticated | Yes | Verifies caller is participant |
| `flag_expense_dispute` | `p_expense_id uuid, p_note text` | `public.expenses` | Authenticated | Yes | Transitions to 'flagged' |
| `resolve_expense_dispute` | `p_expense_id uuid` | `public.expenses` | Authenticated | Yes | Transitions to 'resolved' |
| `set_trip_collab_field` | `p_trip_id uuid, p_field text, p_value jsonb` | `void` | Authenticated | Yes | Allowed fields: 'checklist', 'notes', 'passes', 'stops' |
| `edit_trip_message` | `p_message_id uuid, p_body text` | `public.trip_messages` | Authenticated | Yes | Author only, within edit window |
| `delete_own_account` | None | `void` | Authenticated | Yes | Deletes account, anonymizes records |
| `report_bug` | `p_title, p_description, p_severity, p_category, p_found_by, p_environment, p_repro_steps, p_expected_behavior, p_actual_behavior, p_diagnostics, p_fingerprint` | `public.bugs` | Authenticated | No | Submits bug report |
| `list_my_bug_reports` | None | `table(id, title, status, severity, created_at, updated_at)` | Authenticated | Yes | Returns caller's bug reports |
| `submit_feature_request` | `p_title, p_description, p_category, p_requested_by, p_environment` | `public.features` | Authenticated | No | Submits feature proposal |
| `get_resolved_feature_flags`| `p_trip_id uuid default null` | `jsonb` | Authenticated | Yes | Evaluates flags with hierarchy |
| `get_public_growth_flags` | None | `jsonb` | Anon / Auth | Yes | Public flags for unauthenticated users |
| `set_feature_flag_override`| `p_scope text, p_scope_id text, p_flag_key text, p_value boolean` | `void` | Superadmin | Yes | Overrides flag for user/trip |
| `get_all_feature_flag_overrides` | None | `setof public.feature_flag_overrides` | Superadmin | Yes | Admin flag list |
| `record_join_preview` | `p_code text` | `void` | Anon / Auth | Yes | Growth telemetry counter |
| `log_security_event` | `p_trip_id uuid, p_action text, p_details jsonb` | `void` | Authenticated | Yes | Security audit trail insert |
| `is_superadmin` | None | `boolean` | Authenticated | Yes | Checks superadmin status |
| `set_user_banned` | `p_user_id uuid, p_banned boolean` | `void` | Superadmin | Yes | Toggles user ban flag |
| `delete_user` | `p_user_id uuid` | `void` | Superadmin | Yes | Admin user purge |
| `get_app_config` | None | `setof public.app_config` | Superadmin | Yes | Admin config read |
| `set_app_config` | `p_key text, p_value jsonb` | `public.app_config` | Superadmin | Yes | Admin config write |
| `get_app_flag` | `p_key text` | `jsonb` | Superadmin | Yes | Single config lookup |
| `broadcast_notification` | `p_title text, p_body text, p_trip_id uuid` | `integer` | Superadmin | No | Global push broadcast |
| `count_recycled_expenses` | None | `integer` | Superadmin | Yes | Metrics query |
| `purge_recycle_bin_older_than` | `p_days integer default 30` | `integer` | Superadmin | Yes | Recycle bin cleanup |
| `purge_audit_logs_older_than` | `p_days integer default 90` | `integer` | Superadmin | Yes | Audit log purge |
| `get_notification_stats` | None | `table(total_count, read_count, last_7d_count)` | Superadmin | Yes | Stats query |
| `admin_retention_cohorts` | `p_weeks int default 8` | `table(cohort_week, cohort_size, d1_retained, ...)` | Superadmin | Yes | Retention cohorts |
| `admin_repeat_creator_rate`| None | `table(creators_eligible, repeat_creators)` | Superadmin | Yes | Creator retention |
| `admin_reliability_summary`| `p_days int default 14` | `table(platform, app_version, event, events, users)` | Superadmin | Yes | Stability telemetry |
| `register_device_push_token`| `p_fcm_token text, p_platform text, p_client text default 'flutter', p_app_version text default null` | `uuid` | Authenticated | Yes | Multi-client push registration (Migration 0111) |
| `get_app_version_gate` | `p_client text default 'flutter', p_platform text default null, p_version text default null` | `jsonb` | Anon / Auth | Yes | Native version gate & kill switch (Migration 0112) |
| `semver_compare` | `v1 text, v2 text` | `integer` | Public | Yes | Deterministic semver comparison (Migration 0112) |
| `record_signup_source` | `p_source jsonb` | `void` | Authenticated | Yes | Client attribution & UTM recorder (Migration 0113) |
| `upsert_expense_v1` | `p_id, p_trip_id, p_title, p_amount, p_currency, p_category, p_date, p_paid_by, p_split_mode, p_split_member_ids, ...` | `public.expenses` | Authenticated | Yes | Atomic idempotent expense upsert (Migration 0115) |
| `get_trip_changes` | `p_trip_id uuid, p_since timestamptz default '-infinity'` | `jsonb` | Authenticated | Yes | Incremental delta sync query & tombstones (Migration 0115) |

---

## 5. Realtime Channels & Subscriptions

### 5.1 Publication `supabase_realtime`
The following 5 tables are published to `supabase_realtime`:
1. `public.notifications`
2. `public.trip_chat_read_cursors`
3. `public.trip_messages`
4. `public.trips`
5. `public.trip_collab_signals`

### 5.2 Client Realtime Channels
1. **`trip_messages:{tripId}`**
   - Type: `postgres_changes`
   - Filter: `table=trip_messages`, `filter=trip_id=eq.{tripId}`
   - Events: `INSERT`, `UPDATE`
2. **`notifications:{userId}`**
   - Type: `postgres_changes`
   - Filter: `table=notifications`, `filter=user_id=eq.{userId}`
   - Events: `INSERT`
3. **`trip_chat_read_cursors:{tripId}`**
   - Type: `postgres_changes`
   - Filter: `table=trip_chat_read_cursors`, `filter=trip_id=eq.{tripId}`
   - Events: `INSERT`, `UPDATE`
4. **`trip_collab:{tripId}`**
   - Type: `postgres_changes`
   - Filter: `table=trip_collab_signals`, `filter=trip_id=eq.{tripId}` (Events: `INSERT`, `UPDATE`)
   - Filter: `table=trips`, `filter=id=eq.{tripId}` (Events: `UPDATE`)
5. **`trip_chat_typing:{tripId}`**
   - Type: Broadcast
   - Event: `typing`
   - Payload: `{ memberId: string, name: string }`
6. **`trip_presence:{tripId}`**
   - Type: Presence
   - Key: `userId`
   - Payload: `{ userId: string, displayName: string, avatarUrl: string | null, onlineAt: string }`
7. **`trip_chat_unread:{tripId}`**
   - Type: `postgres_changes`
   - Filter: `table=trip_messages`, `filter=trip_id=eq.{tripId}`
   - Events: `*`

---

## 6. Storage Buckets

| Bucket Name | Visibility | File Size Limit | Allowed MIME Types | Path Convention | Signed URL TTL |
|---|---|---|---|---|---|
| `receipts` | **Private** | 5,242,880 B (5MB) | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` | `{tripId}/{expenseId}.{ext}` | 3600 seconds (1 hour) |
| `chat-media`| **Private** | 5,242,880 B (5MB) | Images + `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/x-m4a`, `audio/aac` | `{tripId}/{messageId}.{ext}` | 3600 seconds (1 hour) |

*RLS Enforcement:* Both buckets require `public.is_trip_participant(((storage.foldername(name))[1])::uuid)` for SELECT, INSERT, and UPDATE.

---

## 7. Edge Functions & Push Notification Payloads

### 7.1 Functions
1. **`send-push`**:
   - Auth: Caller JWT (`Authorization: Bearer <token>`).
   - Verifies caller shares trip with recipient.
   - Throttles `settlement_reminder` to 1 per 24 hours.
   - Respects `trip_mutes` and `quiet_hours_prefs`.
   - Routes digest-opted users to `pending_digest_events`.
   - Sends FCM HTTP v1 message using GoogleAuth.
   - Auto-prunes tokens returning `UNREGISTERED` or `NOT_FOUND`.
2. **`send-digest`**: Triggered daily via pg_cron + shared secret; summarizes queued events into a single FCM push.
3. **`send-lifecycle-nudge`**: Triggered daily via pg_cron; checks nudge candidates (invites, packing, next trip) for trip owners.
4. **`send-weather-nudge`**: Triggered daily via pg_cron; geocodes destination and checks Open-Meteo for stormy/high-precipitation forecasts.

### 7.2 Notification Type Catalogue (`type` and required `params`)

| Notification `type` | Required `params` Keys | Rendered Notification Text |
|---|---|---|
| `expense_added` | `expenseTitle`, `currency`, `amount` | `"{title} — {currency} {amount} added"` |
| `expense_updated` | `expenseTitle` | `"{title} was updated"` |
| `expense_deleted` | `expenseTitle` | `"{title} was deleted"` |
| `expense_restored`| `expenseTitle` | `"{title} was restored"` |
| `member_added` | None | `"You were added to {tripName}"` |
| `member_added_notice` | `memberName` | `"{memberName} was added to the trip"` |
| `member_joined` | `memberName` | `"{memberName} joined the trip"` |
| `settlement_reminder` | `toLabel`, `currency`, `amount`, `fromMemberId`, `toMemberId` | `"You owe {toLabel} {currency}{amount} for this trip"` |
| `settlement_confirmation_requested` | `currency`, `amount` | `"Someone marked {currency} {amount} as paid to you — confirm you received it"` |
| `trip_deleted` | None | `"{tripName} was deleted"` |
| `chat_message` | `senderName`, `preview` | `"{senderName}: {preview}"` |

---

## 8. Authentication & Deep Link Routing

- **Google OAuth**: Browser redirect to Supabase Auth; native redirect to custom scheme `com.triptracker.app://auth-callback`.
- **Email / Password**: Direct sign-in and sign-up with email confirmation.
- **Guest / Demo Mode**: Works completely offline or in unauthenticated sandbox mode.
- **Apple Sign-In**: To be enabled for iOS in Phase 3.
- **Custom Scheme & Universal Links**:
  - `com.triptracker.app://join/:code` -> Join trip preview
  - `com.triptracker.app://live/:token` -> Live location share
  - `com.triptracker.app://share/:token` -> Read-only trip share

---

## 9. Verification Grep Checklist

All client queries in `src/` have been cross-checked against this contract:
- [x] All 20 tables accessed by `.from('...')` documented with column schemas and RLS.
- [x] All 37 `.rpc('...')` calls catalogued with types, auth levels, and idempotency.
- [x] All 7 Realtime channel subscriptions (`trip_messages`, `notifications`, `trip_chat_read_cursors`, `trip_collab`, `trip_chat_typing`, `trip_presence`, `trip_chat_unread`) documented.
- [x] Both storage buckets (`receipts`, `chat-media`) documented with policies and TTL.
- [x] All 4 Edge Functions and 11 notification types catalogued.
