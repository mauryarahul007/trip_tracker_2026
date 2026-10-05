# Phase 5 (FE): Domain core, Drift data layer, outbox sync, realtime

**Track:** Flutter (no UI) · **Size:** XL · **Depends on:** Phases 1, 2, 4 (3 not required) · **Parallel with:** 3
**Read first:** [README.md](README.md), `contract/API_CONTRACT.md`, `contract/SYNC.md`, `fixtures/README.md`.

## Goal
The entire non-visual engine of the app in Dart: models, pure business logic (proven identical to the web via golden fixtures), local database, repositories, an outbox sync engine, and realtime: so UI phases are thin.

## Inputs
`src/types/*`, `src/store/tripStore.ts`, `src/store/authStore.ts`, `src/store/notificationsStore.ts`, `src/services/*`, the pure-logic modules listed in Phase 1 §1.4, `src/hooks/useCrossTripBalances.ts`, `contract/*`, `fixtures/*`.

## Tasks

### 5.1 Domain models (`lib/domain/models`)
freezed + json_serializable immutable models for every app shape in `src/types/index.ts` (Trip, Member, Group, Expense incl. multi-payer & resolvedShares, Category, ChecklistItem, TripNote, TravelPass, TripMessage + payload union, Notification, TripFxConfig, MemberRole, flags, etc.). Separate **DTOs** (`lib/data/dto`, snake_case, PostgREST shape) from **domain models**, with mappers tested against the row↔app fixtures from Phase 1. Money: represent amounts per the web's rule (check `currency.ts`: number vs minor units) and **do not change numeric semantics**; if switching to integer minor units, prove equality on fixtures and ADR it.

### 5.2 Pure logic port (`lib/domain/logic`)
Port, with **one Dart file + one test file per TS module**, the modules in Phase 1 §1.4 table, plus: `settlement.ts`, `defaultSplit.ts`, `currency*.ts`, `expenseQuickParser.ts`, `mathExpression.ts`, `tripCollabMerge.ts`, `duplicateExpenseDetector.ts`, `burnRate.ts`, `predictiveExpenses.ts`, `categoryKeywords/Helper.ts`, `splitwiseImport.ts`, `backupValidation.ts`, `csvExport.ts`, `icsExport.ts`, `passParser.ts`, `passBackStub.ts`, `chatExpenseCards.ts`, `notificationGroups/Text.ts`, `memberRoles.ts`, `tripSort/Suggest/Destination.ts`, `groupNaming.ts`, `dateRange.ts`, `relativeTime.ts`, `joinDeepLink.ts`, `upiLinks.ts`, `signupAttribution.ts`, `syncQueueLabel.ts`, `travelerPassport.ts`, `achievementBadges.ts`, `packingSuggestions.ts`, `shareText.ts`, `countryCurrencyMap.ts`, `placeGazetteer.ts`.
- Domain layer imports **no Flutter**.
- A single generic **fixture runner** loads `fixtures/**/*.json` and asserts equality (use a tolerance of 0 for money, explicit epsilon only where the TS uses floats and the ADR says so).
- Timezone/Intl: web `Intl`/`Date` behaviour differs from Dart `intl`; every date/currency formatting function gets fixture cases for en-IN, en-US and at least one non-Latin-digit locale. Document intentional differences.
- Anything the fixtures do not cover but is non-trivial gets **new fixtures added back to `fixtures/`** (generated from TS) rather than hand-made Dart-only tests.

### 5.3 Local database (Drift)
- Schema mirrors the **hydrated app state**, not necessarily every column: trips, members, groups, group_members, categories, expenses (+ payers/shares as child tables or JSON column, ADR), messages, notifications, checklist/notes/passes (JSON columns acceptable), receipts index, settings kv, **outbox**, **sync_meta** (per-trip cursors from `contract/SYNC.md`).
- Migrations via Drift's `schemaVersion` + step-by-step migration tests (`drift_dev schema` verifier). Never destructive on upgrade.
- Encryption: sensitive data (documents vault, pass attachments) goes to encrypted storage (SQLCipher via `sqlcipher_flutter_libs`, or files + `flutter_secure_storage` key). Decide in ADR; mirror `documentVaultStore.ts`/`passAttachmentStore.ts` behaviour.
- Offline blobs: receipts queue (`offlineReceiptStore.ts`), chat queue (`offlineChatStore.ts`) → files in app-support dir + DB rows.

### 5.4 Repositories (`lib/data/repositories`, interfaces in `lib/domain/repositories`)
One repository per aggregate (Trips, Members/Groups, Expenses, Categories, Messages, Notifications, Settlements, Passes, Profile, Flags, Push tokens, Locations, Receipts/Storage, Growth telemetry, Bugs/Feedback). Each: `Stream<T>` reads from Drift (UI never reads the network directly), `Future` writes that **write local + enqueue outbox in one transaction** (optimistic), explicit network-only methods for anon flows (join preview, share, live location).

### 5.5 Outbox sync engine (`lib/data/sync`)
Implement exactly the semantics of `contract/SYNC.md`:
- Outbox item types = the web queue types; stable ids; payload versioned.
- Single-flight processor, FIFO per entity with cross-entity parallelism where safe, exponential backoff with jitter, **poison-item quarantine** (surface to UI as "sync issue", never block the queue silently), network/auth-expiry pause/resume, runs on app foreground, connectivity regained, and after enqueue.
- "Dirty protection": remote refresh never overwrites entities with pending outbox items (port `collectDirtyExpenseIds` logic).
- Initial sync (`fetchMyTripGraph` equivalent) and incremental sync via the cursor/RPC from Phase 4; **resubscribe → delta sync** after every realtime reconnect.
- Conflict resolution per spec; `ConflictResolverModal` data needs exposed as a stream.
- Background sync: iOS BGAppRefresh / Android WorkManager via `workmanager` (best-effort; foreground is the contract). Document platform limits.
- Observability: structured logs + a debug "Sync inspector" provider (used later by Settings → Diagnostics).

### 5.6 Realtime (`lib/data/realtime`)
Wrap channels from the contract: `trip_collab:{tripId}`, `trip_messages:{tripId}`, `notifications:{userId}`, `trip_chat_read_cursors:{tripId}`, chat unread, peer presence/broadcast. One `RealtimeManager` owning lifecycle (subscribe on trip open, drop on close/background, backoff reconnect), emitting domain events into repositories (never to UI directly).

### 5.7 Auth & session core (no UI)
`AuthRepository`: session stream, email/password, Google ID-token, Apple, sign-out (clears DB + secure storage + unregisters push token), delete account, guest/demo per `contract/AUTH_SETUP.md`, superadmin excluded. Mirrors `authStore.ts` states including `signInsPaused`/banned handling.

### 5.8 Feature flags core
`FlagsRepository`: fetch `get_resolved_feature_flags` + `get_public_growth_flags`, cache in Drift, offline defaults identical to `DEFAULT_FEATURE_FLAGS` (generate a Dart const from the TS registry via a fixture so they cannot drift; include a CI check comparing flag-key sets). Expose `Provider<bool> flag(key)` plus the pack/tier helpers used by nav (`tripTabs` port).

### 5.9 Tests
- Unit: all of the above; golden-fixture runner green.
- **Sync integration tests against staging** (tagged `@Tags(['staging'])`, run in a nightly CI job, not every PR): create→edit→delete→restore offline then reconnect; two simulated devices editing concurrently; kill app mid-flush; duplicate replay; token expiry mid-sync.
- Property-style test for settlements: random expense sets → balances sum to 0 and match the TS fixture engine.

## Deliverables
`lib/domain/**`, `lib/data/**`, Drift schema + migration tests, fixture runner, ADRs (money repr, Drift layout, encryption, background sync), updated `PARITY_MATRIX.md` (logic modules → done), `HANDOFF.md` entry.

## Out of scope
Any screen/widget, push UI, maps, OCR, camera.

## Exit criteria
- [ ] 100% of Phase 1 fixtures pass in Dart CI; fixture count is printed per module.
- [ ] Staging sync suite green twice in a row; outbox survives kill/restart with zero loss and zero duplicates (assert row counts on server).
- [ ] Domain layer has no `package:flutter` import (lint-enforced).
- [ ] Flag key set equals TS registry (CI check).
- [ ] `flutter analyze` clean, coverage report attached for `domain/` (target ≥ 90% lines on logic).
- [ ] A headless **CLI/test harness** can sign in, sync a seeded trip, add an expense offline, reconnect, and see it server-side, demonstrating the engine without UI.
