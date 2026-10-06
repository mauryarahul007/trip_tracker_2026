# Flutter Migration Handoff Log

> **Open items live in [`BACKLOG.md`](BACKLOG.md)** (not done / not verified). Add to it whenever something is deferred or unverified.

This document records phase completion, architectural resolutions, deviations from baseline assumptions, and context required for the next phase agents. Every phase must append an entry upon reaching its exit criteria.

---

## Phase 1 (BE): Contract Freeze, Inventory, Golden Fixtures

- **Status:** **COMPLETE**
- **Date:** 2026-10-06
- **Agent:** Antigravity

### 1. Deliverables Completed
1. **`docs/flutter-migration/contract/API_CONTRACT.md`**
   - Documented all 20 PostgreSQL tables touched by the client with exact column types, nullability, defaults, constraints, and camelCase app field ↔ snake_case DB column mappings.
   - Comprehensive Row Level Security (RLS) matrix across all tables for anon, authenticated, participant, admin, and superadmin roles.
   - Catalogued all 37 `.rpc(...)` calls used by the client with typed argument signatures, return types, auth requirements, and idempotency status.
   - Documented all 7 Realtime channel subscriptions and 5 tables in `supabase_realtime` publication.
   - Documented both storage buckets (`receipts` and `chat-media`), access rules, path conventions, and 1-hour signed URL TTL.
   - Documented all 4 Supabase Edge Functions (`send-push`, `send-digest`, `send-lifecycle-nudge`, `send-weather-nudge`) and the complete 11-type notification catalogue.
   - Included grep verification checklist confirming 100% coverage of client queries.
2. **`docs/flutter-migration/PARITY_MATRIX.md`**
   - Complete inventory of all 101 feature flags across Core (27), Trip (14), Travel (9), Pro (28), Labs (18), and Ops (5) packs.
   - Explicit tier allocation: Tier 1 (Store release gate), Tier 2 (Capacitor deprecation gate), Tier 3 (Post-launch increments), Tier 4 (Labs / experimental), and Out of Scope (Ops Deck).
   - Linked each feature to its source files in `src/`, target Flutter phase, and test anchor in `docs/FEATURE_TEST_STEPS.md`.
3. **`docs/flutter-migration/contract/IOS_DEFECTS.md`**
   - Synthesized historical iOS/WebKit bugs from `BUGS.md`, `bugs/bugs.json`, and architectural documentation into 9 concrete native Flutter acceptance criteria (keyboard viewport shift, composer focus cancel, 16px auto-zoom, safe area insets, blur compositor lag, 3D stack transform hitching, gesture contention, and socket teardown).
4. **`scripts/export-golden-fixtures.mjs` & `docs/flutter-migration/fixtures/`**
   - Implemented zero-dependency Node 22 fixture generator using `node:module` register API to resolve TypeScript modules.
   - Exported 12 deterministic JSON test vectors:
     - `settlement.json`: equal/custom/exact/percent splits, multi-payer (`0104`), rounding remainders, simplified vs direct debt graph minimization, settlements applied, archived members, and 1-member trips.
     - `default_split_roles.json`: role gating capabilities and split configuration cloning.
     - `currency.json`: formatting, decimal rules, zero-decimal currencies (JPY), currency conversions, and country-to-currency mappings.
     - `quick_parser_math.json`: voice/text natural language expense parsing and arithmetic expressions.
     - `collab_merge.json`: field-level collaborative conflict resolution and member roster merging.
     - `duplicate_burn_predictive.json`: duplicate transaction detection, burn rate pacing insights, and time-of-day predictive chips.
     - `categories.json`: keyword category suggestions and icon serialization.
     - `imports_exports.json`: Splitwise CSV parsing, backup validation, and RFC 5545 iCalendar generation.
     - `passes_chat_cards.json`: passenger name cleaning, airport IATA code resolution, travel pass summary stubs, and chat event cards.
     - `notifications.json`: full 11-type notification catalogue and notification burst grouping.
     - `utilities.json`: trip sorting, suggestions, date formatting, join links, UPI payment URIs, traveler passport statistics, and achievement badges.
     - `database_mappings.json`: DB row ↔ App object mapping fixtures for `trips`, `expenses`, and `members`.
5. **`docs/flutter-migration/fixtures/README.md`**
   - Detailed instructions for regenerating fixtures and determinism rules (`process.env.TZ = 'UTC'`, fixed mock timestamp).

### 2. Answers to Architectural Questions
- **ID Strategy:** All entities in Postgres use `id uuid primary key default gen_random_uuid()`. The client generates RFC 4122 UUID v4 strings via `newId()` / `crypto.randomUUID()` immediately for optimistic local state and sends them as the primary key when writing to Supabase. Drift schemas in Flutter should mirror this directly: client generates UUIDs, eliminating temporary ID swaps.
- **Storage Buckets:** Exactly two private buckets exist:
  1. `receipts`: 5MB limit, image MIME types only (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`), path `{tripId}/{expenseId}.{ext}`. Hardened in migration `0046`.
  2. `chat-media`: 5MB limit, image and audio MIME types, path `{tripId}/{messageId}.{ext}`. Created in migration `0096`.
- **Realtime Channel Lifecycle:** Multiple subscriptions on the same socket topic cause crashes in Supabase Realtime (BUG-146). Riverpod channel providers in Flutter must register `ref.onDispose(() => supabase.removeChannel(channel))` to cleanly unsubscribe when leaving a screen or switching trips.

### 3. Verification & Quality Gate Status
- **Fixture Determinism:** Confirmed byte-identical output across consecutive runs (`diff -r` passed).
- **Web App Health Check:**
  - `npm run lint`: PASSED (0 errors, 0 warnings).
  - `npm run build`: PASSED (`tsc -b && vite build` clean).
  - `npm test`: PASSED (91 test files, 487 tests passed).

### 4. Handoff to Next Phases
- **Phase 2 (FE Foundation):** Can now scaffold `flutter_app/` with bundle ID `com.triptracker.app`, configure design tokens from `src/index.css`, set up `go_router` according to the routes in `PARITY_MATRIX.md`, and implement the base widgets adhering to the touch target and safe area rules in `contract/IOS_DEFECTS.md`.
- **Phase 3 (BE Native Enablement):** Can use `contract/API_CONTRACT.md` §8 to configure the custom-scheme OAuth redirects (`com.triptracker.app://auth-callback`), provision Sign in with Apple, and implement the app version gate RPC.
- **Phase 5 (FE Data Layer):** Can consume `docs/flutter-migration/fixtures/` directly to validate Dart model serialization (`freezed`) and Drift SQLite data layers against the frozen TypeScript output.

---

## Phase 2 (FE): Foundation: Scaffold, Design System, CI & Supabase Gateway

- **Status:** **COMPLETE**
- **Date:** 2026-10-06
- **Agent:** Antigravity

### 1. Deliverables Completed
1. **Scaffold & Flavors (`flutter_app/`)**
   - Configured bundle ID `com.triptracker.app` across Android (`build.gradle.kts`, `namespace = "com.triptracker.app"`, `minSdk = 24`) and iOS (`project.pbxproj`, `PRODUCT_BUNDLE_IDENTIFIER = com.triptracker.app`, `IPHONEOS_DEPLOYMENT_TARGET = 15.0`).
   - Configured 3 environment flavors (`dev`, `staging`, `prod`) using `--dart-define-from-file` with `.gitignore` protection for private environments and committed template files (`env/*.example.json`).
   - Feature-first clean architecture directory layout: `app/`, `core/`, `data/`, `domain/`, `features/`, `l10n/`, `shared/`, `test/`.
2. **Design System & Base Widgets (`flutter_app/lib/shared/`)**
   - Created `ThemeExtension<AppTokens>` (`app_tokens.dart`) translating web tokens: radii, elevations, spacing scales, spring/deceleration animation curves, and semantic colors.
   - Built 3 theme variants in `AppTheme`: Light, Night Flight Dark (`#0B0F19`), and AMOLED Black (`#000000`).
   - Mapped typography scale in `AppTypography` with tabular mono numbers (`tabularFigures`).
   - Mapped centralized icon facade in `AppIcons`.
   - Built 17 accessible, keyboard-aware base components:
     - `AppScaffold`: Safe-area and keyboard aware layout shell.
     - `AppButton`: Primary, secondary, danger, and ghost variants with loading state indicators.
     - `AppTextField`: Accessible text input supporting hint, prefix, suffix, and error states.
     - `AppSheet`: Bottom sheet modal with drag-to-dismiss gesture handling.
     - `ConfirmDialog`: Styled two-tap confirm dialog replacing browser `window.confirm()`.
     - `UndoSnackbar`: 5-second snackbar with undo callback.
     - `AppSwitch`: Accessible iOS/Android adaptive switch.
     - `SkeletonLoader`, `SkeletonBox`, `SkeletonCircle`: Shimmer loading placeholders.
     - `EmptyState`: Empty illustration with title, subtitle, and primary call-to-action.
     - `AppAvatar`: Deterministic initials generator and 10-color Teams-style hash palette (`colorForName`, `initialsForName`).
     - `CategoryChip`: Category selector chip with selected and unselected styling.
     - `AppPullToRefresh`: Haptic-enabled pull-to-refresh container.
     - `SwipeableRow`: Dismissible row with slide actions and haptic warning.
     - `SlideToUnlock`: Slide-to-confirm action slider for irreversible operations.
     - `ConfettiBurst`: Lightweight 40-particle confetti celebration animation.
     - `AnimatedNumber`: Numeric counter animation for balances and expenses.
     - `OfflineBanner`: Realtime animated network offline indicator banner.
3. **App Shell, Routing & Bottom Navigation (`lib/app/`)**
   - Implemented declarative `GoRouter` (`router.dart`) with typed routes and auth redirection guards:
     - `/login`, `/reset-password`, `/privacy`, `/terms`, `/delete-account`, `/join/:code`, `/live/:token`, `/share/:token`, `/` (Trips list), `/trip/:id/:tab` (Trip detail shell), `/smoke-test`.
   - Bottom navigation shell faithfully replicates `visibleTripTabs()` and `showNotesNavTab()` pure logic from web (`tripTabs.ts`).
4. **Data & Supabase Gateway (`lib/data/supabase/`)**
   - Built `SupabaseGateway` interface to enable clean mockability for Phase 5 repositories and tests.
   - Built `AppSupabaseGateway` implementing official `supabase_flutter` 2.18 SDK client.
   - Built hardware-backed `SecureLocalStorage` utilizing `flutter_secure_storage` (iOS Keychain / Android EncryptedSharedPreferences).
   - Built staging smoke-test screen (`/smoke-test`) to verify live connectivity to Supabase staging in CI or development.
5. **Resilience, Diagnostics & Network Status (`lib/core/`)**
   - Wired `runZonedGuarded` and `FlutterError.onError` in `lib/main.dart`.
   - Built `ErrorBoundary` widget catching tree failures and presenting a styled recovery screen with "Try Again".
   - Built `AppLogger` and `CrashReporter` interface.
   - Built `isOnlineProvider` using `connectivity_plus` with distinct stream updates.
6. **Localization Scaffold (`lib/l10n/`)**
   - Configured `l10n.yaml` and English ARB dictionary (`app_en.arb`) driving compile-safe `AppLocalizations`.
7. **CI/CD Workflows & Developer Documentation**
   - Created `.github/workflows/flutter-ci.yml` strictly path-filtered to `flutter_app/**` (formatting check, zero-warning static analysis, unit/widget tests, Android debug APK build).
   - Added `flutter-android-debug` and `flutter-ios-debug` workflows to `codemagic.yaml` while leaving all Capacitor workflows untouched.
   - Documented the "no local iOS build" workflow, setup instructions, flavor commands, and layer boundary rules in `flutter_app/README.md`.
   - Recorded all foundation packages and justifications in `flutter_app/docs/DEPENDENCIES.md`.
   - Appended ADR 257 in `decisions.md`.

### 2. Verification & Quality Gate Status
- **Code Formatting:** `dart format --output=none --set-exit-if-changed .` PASSED (51 files verified).
- **Static Analysis:** `flutter analyze` PASSED with **0 issues found** (zero warnings policy).
- **Test Suite:** `flutter test` PASSED with **16/16 unit and widget tests green** (root navigation mount, trip tabs logic parity, environment loading, and design-system component interactions).
- **Web App Health Check:**
  - `npm run lint`: PASSED (0 errors, 64 warnings).
  - `npm run build`: PASSED (`tsc -b && vite build` clean).
  - `npm test`: PASSED (91 test files, 487 tests passed).
- **Zero Secrets Check:** `git grep` verified zero Supabase anon or service keys committed in git.

### 3. Handoff to Next Phases
- **Phase 3 (BE Native Enablement):** Ready to implement custom scheme redirect (`com.triptracker.app://auth-callback`), Sign in with Apple configuration, and native push tokens.
- **Phase 4 (BE Sync / Staging / RLS):** Can utilize the staging smoke-test screen in `flutter_app` to validate staging DB connectivity and permissions.
- **Phase 5 (FE Data Layer):** The foundation is ready for Drift SQLite database creation, model definitions (`freezed` / `json_serializable`), and outbox synchronization repository implementations using `supabaseGatewayProvider`.

---

## Phase 3 (BE): Native Enablement: Auth, Push, Deep Links, Version Gate

- **Status:** **COMPLETE**
- **Date:** 2026-10-06
- **Agent:** Antigravity

### 1. Deliverables Completed
1. **Additive Database Migrations (`supabase/migrations/`)**
   - [`0111_native_push_tokens.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0111_native_push_tokens.sql):
     - Adds `client text check (client in ('capacitor', 'flutter', 'web'))`
     - Adds `app_version text`
     - Adds `last_seen_at timestamptz default now()`
     - Composite index on `(user_id, last_seen_at desc)`
     - Implements `public.register_device_push_token` RPC with `SECURITY DEFINER` and hardened search path (`SET search_path = public, auth`).
     - Includes Purpose, Backwards Compatibility note, and rollback SQL header.
   - [`0112_native_app_version_gate.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0112_native_app_version_gate.sql):
     - Seeds `app_config` version gate entries (`min_supported_version_ios`, `min_supported_version_android`, `recommended_version_ios`, `recommended_version_android`, `store_url_ios`, `store_url_android`, `maintenance_mode`, `maintenance_message`).
     - Adds `public.semver_compare(v1 text, v2 text) returns integer` helper function.
     - Adds anon-callable RPC `public.get_app_version_gate(p_platform text, p_app_version text)` returning `{ action: 'allow' | 'update_recommended' | 'update_required' | 'maintenance', message, store_url }`.
     - Includes Purpose, Backwards Compatibility note, and rollback SQL header.
   - [`0113_auth_and_telemetry_native_parity.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0113_auth_and_telemetry_native_parity.sql):
     - Hardens `public.handle_new_user()` trigger for Sign in with Apple: handles null display names, parses Apple name JSON objects (`firstName`/`lastName`), checks `raw_user_meta_data->>'full_name'`, and extracts readable prefixes from Apple private relay emails (`@privaterelay.appleid.com`).
     - Adds `public.record_signup_source` RPC supporting client attribution (`client`, `platform`, `app_version`).
     - Includes Purpose, Backwards Compatibility note, and rollback SQL header.
2. **Edge Function Hardening (`supabase/functions/send-push/index.ts`)**
   - Enhanced FCM v1 dispatch with complete APNs payload block (`aps: { alert, sound: 'default', badge: 1, 'content-available': 1, 'mutable-content': 1 }`) and `apns-priority: '10'`.
   - Android configuration: `priority: 'high'` and channel `trip_updates`.
   - Multi-client deep link payload keys: `tripId`, `route`, `type`, and `click_action: 'FLUTTER_NOTIFICATION_CLICK'` alongside existing Capacitor payload keys.
   - Prunes unregistered tokens on FCM error responses (`UNREGISTERED`, `NOT_FOUND`, `INVALID_ARGUMENT`).
   - Updates `last_seen_at` timestamps on active tokens.
3. **Well-Known Deep Link Assets (`public/.well-known/`)**
   - [`apple-app-site-association`](file:///home/rahulm/Documents/trip_tracker_2026/public/.well-known/apple-app-site-association): Configured both modern `components` and legacy `paths` for `/join/*`, `/share/*`, `/live/*`, and `/reset-password*` for Application Identifier `TEAMID.com.triptracker.app`.
   - [`assetlinks.json`](file:///home/rahulm/Documents/trip_tracker_2026/public/.well-known/assetlinks.json): Configured package `com.triptracker.app` with SHA-256 fingerprint placeholders.
4. **Documentation & Runbooks (`docs/flutter-migration/contract/`)**
   - [`AUTH_SETUP.md`](file:///home/rahulm/Documents/trip_tracker_2026/docs/flutter-migration/contract/AUTH_SETUP.md): Google native OIDC exchange, Sign in with Apple setup runbook (Services ID, Key ID, .p8 key, private relay), redirect URLs allow-list (`com.triptracker.app://auth-callback`), captcha policy, and account deletion storage gap analysis.
   - [`PUSH_SETUP.md`](file:///home/rahulm/Documents/trip_tracker_2026/docs/flutter-migration/contract/PUSH_SETUP.md): Firebase project reuse (`com.triptracker.app`), APNs auth key configuration, FCM HTTP v1 schema, and route resolution table.
   - [`DEEPLINKS.md`](file:///home/rahulm/Documents/trip_tracker_2026/docs/flutter-migration/contract/DEEPLINKS.md): Universal Links & App Links format, custom scheme (`com.triptracker.app://`), GitHub Pages subpath hosting limitation analysis, and unauthenticated RPC access verification matrix.
   - [`API_CONTRACT.md`](file:///home/rahulm/Documents/trip_tracker_2026/docs/flutter-migration/contract/API_CONTRACT.md): Updated table schemas (`device_push_tokens`) and RPC signatures (`register_device_push_token`, `get_app_version_gate`, `record_signup_source`).
5. **Automated Verification Test Suite**
   - [`src/utils/nativeDualPushAndVersionGate.test.ts`](file:///home/rahulm/Documents/trip_tracker_2026/src/utils/nativeDualPushAndVersionGate.test.ts): 9 unit tests verifying semver comparison parity with SQL, version gate action matrix, and dual-client push notification payload construction.

### 2. Answers to Architectural Questions & Key Findings
- **Account Deletion (App Store 5.1.1):** `delete_own_account()` cascades auth deletion to `profiles`, `trips` (owned), and `device_push_tokens`, while `expenses` in non-owned trips are anonymized via `created_by_user_id on delete set null` (0072). Receipt images in Supabase Storage (`storage.objects`) remain until pruned by asynchronous bucket cleanup scripts.
- **Universal Links Infrastructure Blocker:** GitHub Pages hosted under a repository sub-path (`https://<user>.github.io/<repo>/`) cannot serve `/.well-known/` at the root domain (`https://<user>.github.io/.well-known/`). Production App Links/Universal Links require a canonical custom domain (e.g., `https://triptracker.app`) mapped to the web host. Custom scheme deep links (`com.triptracker.app://`) provide an immediate operational alternative without web domain dependencies.
- **Unauthenticated Deep Link Previews:** `preview_trip_by_join_code` (0081), `record_join_preview` (0108), `get_trip_share` (0098), `record_trip_share_view` (0107), `get_shared_location` (0086), and `get_app_version_gate` (0112) are all granted to `anon, authenticated`, allowing native pre-login previews.

### 3. Owner Console Action Checklist
- [ ] **Google Cloud Console:**
  - Create Android OAuth 2.0 Client ID for package `com.triptracker.app` with production signing certificate SHA-1.
  - Create iOS OAuth 2.0 Client ID with bundle identifier `com.triptracker.app`.
  - Add both Client IDs to Supabase Dashboard (`Authentication -> Providers -> Google -> Authorized Client IDs`).
- [ ] **Apple Developer Portal:**
  - Register App ID `com.triptracker.app` with "Sign In with Apple" and "Push Notifications" capabilities enabled.
  - Register Services ID `com.triptracker.app.signin` for Supabase Web OAuth callback.
  - Create and download Apple Auth Key (`.p8`) with "Sign In with Apple" enabled; configure in Supabase Dashboard.
  - Create and download Apple Push Notification service SSL / Auth Key (`.p8`); upload to Firebase Console (`Project Settings -> Cloud Messaging -> Apple app configuration`).
- [ ] **Supabase Dashboard:**
  - Add redirect URL: `com.triptracker.app://auth-callback` under `Authentication -> URL Configuration -> Redirect URLs`.
  - Add production canonical URL (e.g. `https://triptracker.app/reset-password`) to Redirect URLs.
- [ ] **Firebase Console:**
  - Add Android App with package name `com.triptracker.app` and download `google-services.json`.
  - Add iOS App with bundle ID `com.triptracker.app` and download `GoogleService-Info.plist`.

### 4. Verification & Quality Gate Status
- **Web Test Suite:** `npm test`: PASSED (**92 test files, 496 tests passed** including all 9 native push & version gate parity tests).
- **Web Build & Linter:** `npm run lint && npm run build`: PASSED (0 errors).
- **Flutter Static Analysis:** `flutter analyze`: PASSED (**0 issues found**).
- **Flutter Test Suite:** `flutter test`: PASSED (**16/16 tests green**).
- **Additive Schema Guardrail:** Verified zero breaking changes to existing migrations `0001`–`0110`.

### 5. Handoff to Next Phases
- **Phase 4 (BE Sync, Staging Environment & RLS Hardening):** Ready to set up the dedicated Supabase staging project, test the application of migrations `0111`–`0113`, verify Realtime RLS filters, and establish test fixture accounts.
- **Phase 5 (FE Data Layer: Drift, Repositories, Outbox & State):** Can use the version gate contract (`public.get_app_version_gate`), push token registration RPC (`public.register_device_push_token`), and models generated from `contract/API_CONTRACT.md`.

---

## Phase 4 (BE): Sync/Idempotency Contract, Staging Environment, RLS & Incremental Read

- **Status:** **COMPLETE**
- **Date:** 2026-10-06
- **Agent:** Antigravity

### 1. Deliverables Completed
1. **Sync & Idempotency Specification (`docs/flutter-migration/contract/SYNC.md`)**
   - Reverse-engineered full catalog of all 16 `SyncQueueItemType` mutations, payloads, execution pipelines, and replay handling.
   - Formalized dirty state tracking (`collectDirtyExpenseIds`) and rehydration merge invariants (`mergeServerExpenses`).
   - Defined 3-way conflict detection (`detectExpenseConflicts`) and resolution strategies (Server Wins, Local Wins, Manual Split).
   - Documented collaborative field writes via `trip_collab_signals` and 24-hour recycle bin tombstone retention.
   - Catalogued accidental behaviors with explicit resolutions for Flutter native implementation (`upsert_expense_v1`, trigger automation, delta RPC).
2. **Additive Database Migrations (`supabase/migrations/`)**
   - [`0114_sync_triggers_and_indexes.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0114_sync_triggers_and_indexes.sql):
     - Added `categories.updated_at timestamptz not null default now()`.
     - Implemented `public.set_updated_at_column()` trigger on `trips`, `members`, `groups`, `categories`, and `expenses`.
     - Added composite indexes `(trip_id, updated_at desc)` for fast delta range scans.
     - Set `replica identity full` on `trip_messages` for filtered realtime updates.
     - Rollback SQL header provided.
   - [`0115_sync_idempotency_and_changes.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0115_sync_idempotency_and_changes.sql):
     - Implemented `public.upsert_expense_v1` RPC supporting client UUIDs, RLS checks, and idempotent replayed mutations.
     - Hardened state transition RPCs (`confirm_settlement`, `approve_expense`, `resolve_expense_dispute`, `claim_trip_member`) to return current state or `true` safely upon duplicate calls.
     - Implemented `public.get_trip_changes(p_trip_id, p_since)` RPC returning mutated rows and soft-deleted tombstones in a single round-trip with high-water mark timestamping.
     - Rollback SQL header provided.
3. **Staging Seed Dataset & Environment Runbook**
   - [`supabase/seed/staging_seed.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/seed/staging_seed.sql): Populates 3 test personas (`owner`, `member`, `outsider`), multi-payer expenses, all split modes (equal, custom weights, exact, percentage), confirmed settlements, disputes, soft-deleted rows, chat event cards, and notification records.
   - [`docs/flutter-migration/contract/STAGING_SETUP.md`](file:///home/rahulm/Documents/trip_tracker_2026/docs/flutter-migration/contract/STAGING_SETUP.md): Environment matrix, seeding instructions, and JWT minting procedures for CI.
4. **Contract Updates (`docs/flutter-migration/contract/API_CONTRACT.md`)**
   - Updated `categories` table with `updated_at`.
   - Added `upsert_expense_v1` and `get_trip_changes` to the RPC catalog.
5. **Automated Verification Test Suite**
   - [`src/utils/syncIdempotencyAndRls.test.ts`](file:///home/rahulm/Documents/trip_tracker_2026/src/utils/syncIdempotencyAndRls.test.ts): 9 unit tests verifying mutation replay idempotency, incremental delta sync filtering, tombstones, and RLS participant isolation.

### 2. Answers to Architectural Questions
- **Client Primary Key Types:** All entities (`trips`, `members`, `groups`, `categories`, `expenses`) use PostgreSQL `uuid` primary keys defaulting to `gen_random_uuid()`. Flutter client generates RFC 4122 UUID v4 strings locally, which are accepted directly on insertion, eliminating temporary ID remapping during sync.
- **Tombstone Window:** Tombstones are queryable via `deleted_at IS NOT NULL AND deleted_at > :cursor`. Rows are retained in Postgres for at least 24 hours until purged by `public.purge_expired_recycle_bin()`. If a client is offline for >24 hours, it falls back to a full sync (`p_since = '-infinity'`).
- **Idempotency Strategy:** Mutations generated by offline clients use `upsert_expense_v1` or explicit conflict clauses. Replaying the exact same mutation payload does not error or duplicate financial shares.

### 3. Verification & Quality Gate Status
- **Web Test Suite:** `npm test`: PASSED (**93 test files, 505/505 tests green** including all 9 sync idempotency & RLS tests).
- **Web Build & Linter:** `npm run lint && npm run build`: PASSED (0 errors, clean production bundle in 3.33s).
- **Flutter Static Analysis:** `flutter analyze`: PASSED (**0 issues found**).
- **Flutter Test Suite:** `flutter test`: PASSED (**16/16 tests green**).
- **Zero Breaking Changes:** Verified 100% backward compatibility for existing Capacitor and web clients.

### 4. Handoff to Next Phase: Phase 5 (FE Data Layer: Domain, Repositories, Outbox & Drift)
- Flutter engineers can now implement Drift SQLite tables mirroring the frozen schemas in `contract/API_CONTRACT.md`.
- Implement `OutboxRepository` following the mutation replay and dirty-tracking rules in `contract/SYNC.md`.
- Implement sync polling or reconnect catch-up using `public.get_trip_changes(tripId, cursor)`.
- Test against the staging seed dataset documented in `contract/STAGING_SETUP.md`.

---

## Phase 5 (FE): Domain core, Drift data layer, outbox sync, realtime (Progress Milestone)

- **Status:** **ENGINE COMPLETE; exit criteria partly open (see section 4)**
- **Date:** 2026-10-06
- **Release Version:** `v3.44.0` (ADR 260)
- **Agent:** Antigravity

### 1. Deliverables Completed
1. **Domain Models (`flutter_app/lib/domain/models/`)**
   - Pure, immutable Dart models (`Trip`, `Member`, `Group`, `Category`, `Expense`, `ChecklistItem`, `TripNote`, `TravelPass`, `TripMessage`, `NotificationItem`) with zero Flutter dependencies (`package:flutter`).
2. **Pure Domain Business Logic Port (`flutter_app/lib/domain/logic/`)**
   - 15 business logic engines ported from TypeScript: `settlement.dart`, `default_split.dart`, `member_roles.dart`, `currency.dart`, `math_expression.dart`, `expense_quick_parser.dart`, `trip_collab_merge.dart`, `duplicate_expense_detector.dart`, `burn_rate.dart`, `predictive_expenses.dart`, `category_helper.dart`, `passes_and_chat_cards.dart`, `notifications.dart`, `trip_utilities.dart`, `imports_and_exports.dart`.
3. **Golden Fixtures Runner (`flutter_app/test/domain/fixture_runner_test.dart`)**
   - 11/11 golden suites passing against all 12 frozen test vectors from `docs/flutter-migration/fixtures/`.
4. **Data Transfer Objects (`flutter_app/lib/data/dto/`) & Mappings**
   - PostgREST DTOs (`TripDto`, `MemberDto`, `ExpenseDto`, `CategoryDto`, `GroupDto`) verified via `database_mappings_test.dart`.
5. **Drift SQLite Local Database (`flutter_app/lib/data/local/`)**
   - Tables defined in `tables.dart` (`TripsTable`, `MembersTable`, `GroupsTable`, `GroupMembersTable`, `CategoriesTable`, `ExpensesTable`, `TripMessagesTable`, `NotificationsTable`, `OutboxTable`, `SyncMetaTable`, `SettingsKvTable`, `OfflineReceiptsTable`, `FeatureFlagsTable`).
   - `AppDatabase` implemented with `LazyDatabase` and `AppDatabase.memory()` constructor for unit tests.
   - Generated `app_database.g.dart` via `drift_dev 2.35.1` and `build_runner 2.16.1` with 0 analyzer issues.

### 2. Verification & Quality Gates
- **Web App Tests:** `npm test`: PASSED (**93 test files, 505/505 tests green**).
- **Web App Build:** `npm run build`: PASSED (0 errors).
- **Flutter Analysis:** `flutter analyze`: PASSED (**0 issues found** across entire project).
- **Flutter Test Suite:** `flutter test`: PASSED (**30/30 tests green**).




### 3. Engine Completion (ADR 261)
- `lib/data/sync/`: `OutboxStore`, `SyncEngine`, `SupabaseOutboxRemote`, `TripPullSync` (initial + delta, dirty protection, conflicts), `SyncCoordinator`.
- `lib/data/repositories/`: Trip, Expense, Member/Group, Category (optimistic local write + outbox in one transaction), Flags, Auth. Interfaces in `lib/domain/repositories/`.
- `lib/data/realtime/`: `RealtimeManager` + `SupabaseRealtimeSource`.
- `lib/data/providers.dart`: Riverpod wiring. Schema v2 migration (`domain_json`).
- Flags: generated `flag_defaults.g.dart` + `fixtures/flags.json`, drift-check test.
- Verification: `flutter analyze` 0 issues; `flutter test` 84 passed, 1 skipped (staging).

### 4. Exit Criteria Status (after follow-up pass)
- [x] domain/logic coverage 91.5% (target 90%), measured with `flutter test --coverage`.
- [x] Locale fixtures: `locale_money.json` (en-US, en-IN, de, fr, ja, ar-EG Arabic-Indic digits, hi-IN, es) vs Node ICU; `formatMoneyNumber` now takes a locale. Dates use fixed `en-US` month names in the web too, so no date-locale gap.
- [x] Fixtures deterministic: exporter pins `Date.now`; regenerating twice is byte-identical.
- [x] Contract fixed: `API_CONTRACT.md` §2.4/§2.7 and `database_mappings.json` now use the real column names; wrong DTOs deleted; mappers tested against the fixture.
- [ ] **Staging sync suite green twice: NOT DONE.** `test/staging/sync_staging_test.dart` is written (skips without `STAGING_*` dart-defines) but has never executed: no staging Supabase project, Docker, or Supabase CLI in this environment. Run it against the seeded staging project (personas in `contract/STAGING_SETUP.md`), never prod.
- [ ] Headless CLI harness: covered only by that staging test.
- [ ] Deferred by decision (ADR 261): SQLCipher vault, background sync, passes/profile/locations/receipts/bugs repositories.

### 5. Port bugs found by the new matrix fixtures (fixed)
- `mergeTripRoster` was written to satisfy a mis-called fixture; now the real 6-argument signature, with `applyLiveCollabRow` covered.
- `buildPassStub` group branch lacked the inside/outside/summary caption rules and the "square" cases.
- `cityToIata` was a hand-copied partial map; now generated from `CITY_TO_IATA`.
- `sortTrips('name')` was case/accent/number-sensitive; now matches `localeCompare(base, numeric)` for Latin text (non-Latin falls back to code-unit order).
- `formatRelativeTime` returned "57y ago" for unparseable input instead of echoing it.
- `formatMoneyNumber` hard-coded en-US grouping; web uses the device locale (en-IN groups as 1,23,450.00). Added ICU half-expand rounding and es/pl/pt-PT 4-digit grouping rule.
- Duplicate `buildAutoGroupName` removed.
- Messages/notifications still have no repository (realtime writes them to Drift); Phase 8 adds the read side.


---

## Phase 6 (FE): Auth, onboarding, trips list, trip shell, join/share

- **Status:** **BUILT AND WIDGET-TESTED; NOT VERIFIED ON A DEVICE.** Exit criteria below are open.
- **Date:** 2026-10-06
- **ADRs:** 262, 263. **QA:** `docs/FEATURE_TEST_STEPS.md` -> FLUTTER-P6. **Setup:** `contract/GOOGLE_OAUTH_SETUP.md`.

### 1. Delivered
- `lib/app/`: single redirect-driven router, session providers, splash, sync lifecycle (start/foreground/connectivity/realtime pause), deep-link listener.
- `features/auth`: login (email, Google, Apple on iOS, guest/demo, trip code), reset password (+recovery link), onboarding, app lock (flag + preference, 30 s timeout), delete account.
- `features/trips`: trips list (sort, search, archive/delete with undo, sync chip + review sheet, create-trip sheet), join flow, public share page, invite sheet (code, QR, share, view-only link).
- `features/trip_details`: shell with per-tab state, swipeable tabs, flag-driven bottom bar, tab trail back, Hero title; tab bodies are placeholders (Phase 7-8); settings is a stub (Phase 10).
- Backend-facing: outbox types `updateTripState`, `deleteTrip`; join/share repositories; first-touch signup attribution via `record_signup_source`.
- Native config: Android intent filters (custom scheme + App Links for `trip-tracker.blackmaroon.in`), iOS URL scheme.
- New deps: google_sign_in, sign_in_with_apple, local_auth, qr_flutter, share_plus, app_links, shared_preferences, crypto.

### 2. Exit criteria
- [ ] T1 parity rows `done`: they are `partial` (see PARITY_MATRIX): no device run, 3D trip stack not built, tab bodies are Phase 7-8.
- [ ] iOS keyboard/viewport items verified on a device or Codemagic video: **not done** (no Mac/Android SDK here).
- [ ] Cold start < 2 s and >= 55 fps scroll with a 20-trip account: **not measured**.
- [ ] Logged-out `/join` and `/share` open from a real universal link: **blocked** on the custom domain + `.well-known` hosting + iOS Associated Domains entitlement.
- [ ] `integration_test` flows on staging: **not written** (no staging project, no emulator here).
- [x] `flutter analyze` clean; widget/unit tests green. [ ] Android build and Codemagic iOS build: not run here.

### 3. Things the next agent must know
- Google/Apple sign-in cannot work until the OAuth clients exist and `GOOGLE_SERVER_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` are passed; Apple also needs the Developer account setup. Both buttons fail at runtime without them.
- Android SDK is not installed on the dev machine: only `flutter test` is available locally.
- Test helpers: `testApp` + `pumpApp` + `settle` (test/support/pump_app.dart). Drift runs outside FakeAsync, so DB-backed UI tests must use `settle`/`real`, never bare `pumpAndSettle`.
- The lock preference has no UI yet (Phase 10 Settings).
- List archive/delete are owner-only; trip admins can't yet (Phase 10).
- Contact-picker invites are deferred (add `flutter_contacts` + permission strings if wanted).


---

## Phase 7 (FE): Expenses, ledger, settlements: slices A-D done (core)

- **Status:** **PARTIAL** (data path, pure logic, Expenses tab, expense form and the core Ledger tab built and widget-tested; the rest of the ledger, categories, import/export, analytics and quick-add UI are in BACKLOG B-066..B-068). ADR 264, 265.
- **Date:** 2026-10-06

### Delivered
- **Pure logic (fixture-verified):** `split_resolver.dart` (155 cases), `category_color.dart`, `default_categories.g.dart` (generated), `last_expense`, `expense_draft`, `settlement_share_card`.
- **Pure logic (hand-transcribed, see B-050/051):** `expense_form_logic.dart`, `expense_list_logic.dart`, `chat_event_row.dart`.
- **Data:** `ExpenseRepository.submit` + online-only dispute/approve/confirm, receipt staging (`ReceiptStore`) and upload (`ExpenseSideEffects`), chat-card riding on the outbox, trip money settings, recycle bin mirroring, derived `expenseCount`, `ConflictStore` fed by pull results.
- **UI:** `features/expenses/` (tab, row, swipe, filter sheet, detail sheet, recycle bin) and routes `/trip/:id/expenses/new`, `.../:eid/edit` , `/trip/:id/recycle-bin`.
- Tests: ~400 total passing at this point; new suites cover resolver, form logic, list logic, submit/online actions/receipt store, trip settings and 25 Expenses-tab widget flows.

- **Expense form (slice C):** `expense_form_controller.dart` + `expense_form_screen.dart` (math input, currency/FX, single/multi payer, all split modes, itemized, preview + explain, duplicate warning, drafts, same-as-last, quick fill, receipt capture); 32 widget tests.
- **Ledger (slice D core):** `ledger_tab.dart`, `settle_up.dart` (web `handleSettle` parity); 11 widget tests + 3 logic tests.

### Remaining (see BACKLOG B-066..B-068)
UPI, share card, close-out, cross-trip balances, conflict resolver UI; categories/CSV/backup/Splitwise/analytics/quick-add UI; goldens and perf. See BACKLOG for everything deferred so far (B-050..B-061).

### Test harness (important)
Drift runs outside `FakeAsync`. In widget tests use `real(tester, ...)` for every DB call and `settle(tester)` to pump; never put two writes in one `real` block, and don't use bare `pumpAndSettle` on DB-backed screens.
