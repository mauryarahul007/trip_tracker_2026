# Flutter Migration: Master Plan

Migrate the Trip Tracker **UI** from React + Capacitor (WebView) to **Flutter** for iOS and Android. Keep the **existing Supabase backend** and the **existing web app**. Plans only: no code is written by this document.

> **Deferred / unverified work is tracked in [`BACKLOG.md`](BACKLOG.md): add to it, never silently skip.**
>
> Every AI agent: read THIS file first (it is the shared contract), then open **only your phase file**. Do not load other phase files unless your phase says so.

---

## 1. Why, and what "done" means

- The iOS app is a Capacitor WebView; its UI misbehaves on iOS (keyboard/viewport, compositor/scroll, WebKit perf: see `docs/explanation-mobile-compositor-and-webkit-performance.md`, `docs/explanation-trip-stack-and-viewport-architecture.md`, `BUGS.md`). A native UI removes that whole bug class.
- **Done** = a Flutter app on iOS + Android at feature parity with the web app's *Core, Trip, Travel* packs (Pro/Labs by tier, see §6), talking to the same Supabase project, shipped to the existing store listings, while the web app keeps deploying unchanged from `main`.

## 2. Verified facts about the current system (the migration baseline)

| Area | Fact (verified in repo, 2026-10-03) |
|---|---|
| Web stack | React 19, Vite 8, TypeScript 6, zustand 5, react-router 7, maplibre-gl, tesseract.js (OCR), unpdf, fuse.js, qrcode, lucide-react |
| Native wrapper | Capacitor 8 (iOS+Android), appId `com.triptracker.app`; plugins: app, browser, camera, geolocation, haptics, keyboard, local-notifications, push-notifications, status-bar, contacts, speech-recognition, capgo-updater (self-hosted OTA) |
| Web routes (`src/main.tsx`) | `/login`, `/reset-password`, `/privacy`, `/terms`, `/delete-account`, `/join/:code`, `/live/:token`, `/share/:token`, `/*` (main app) |
| Trip tabs (`src/utils/tripTabs.ts`) | `chat`, `expenses`, `ledger`, `members`, `notes`; Settings from header; chat-first nav is a flag |
| Client state | `src/store/tripStore.ts` (~3.7k lines) + `authStore.ts`, zustand, persisted to IndexedDB key `trip_tracker_state`. **Offline-first with a `syncQueue`** replayed to Supabase. Big-bang rewrite risk lives here. |
| Supabase | 110 migrations (`supabase/migrations/0001…0110`), ~184 RLS policy statements, 4 edge functions (`send-push` FCM v1, `send-digest`, `send-lifecycle-nudge`, `send-weather-nudge`) |
| Tables the client touches | trips, expenses, trip_messages, members, notifications, groups, group_members, bugs, member_locations, receipts, profiles, device_push_tokens, categories, trip_mutes, features, trip_chat_read_cursors, quiet_hours_prefs, notification_digest_prefs, security_audit_logs |
| RPCs the client calls | ~40 (e.g. `claim_trip_member`, `lookup_trip_by_join_code`, `preview_trip_by_join_code`, `get_trip_share`, `get_shared_location`, `confirm_settlement`, `approve_expense`, `flag/resolve_expense_dispute`, `set_trip_collab_field`, `get_resolved_feature_flags`, `delete_own_account`, `report_bug`, `submit_feature_request`, plus admin ones) |
| Realtime | channels: `trip_messages:{tripId}`, `notifications:{userId}`, `trip_chat_read_cursors:{tripId}`, `trip_collab:{tripId}`, `trip_chat_unread:{tripId}`, presence (`usePeerPresence`), chat broadcast |
| Storage | bucket `receipts` (private, signed URLs), chat-media bucket (0096), plus a bucket from 0046 (identify in Phase 1) |
| Auth | Google OAuth (browser redirect + custom-scheme return), email/password + reset, guest, demo, superadmin (Turnstile captcha only on superadmin login) |
| Push | `device_push_tokens(user_id, platform ios|android, fcm_token)`; server sends via **FCM HTTP v1**. Flutter `firebase_messaging` yields the same token type: backend push needs no redesign. |
| Feature flags | 6 packs: `core, trip, travel, pro, labs, ops`; roughly 100 flags in `src/utils/featureFlags.ts`; resolved server-side via `get_resolved_feature_flags` + per-user overrides |
| CI | `.github/workflows/{ci,build-android,build-ios,deploy-pages,deploy-ec2}.yml`, `codemagic.yaml` |
| Dev machine | Linux. **iOS cannot be built locally**; iOS verification = Codemagic macOS builds or a Mac. |

Product behaviour source of truth: `docs/howto-*.md`, `docs/reference-*.md`, `docs/explanation-*.md`, `docs/FEATURE_TEST_STEPS.md` (1.2k lines of manual QA → becomes Flutter acceptance criteria), `FEATURES.md`, `PRODUCT.md`, `DESIGN.md`.

## 3. Architecture decisions (defaults; amend only via ADR in `decisions.md`)

| # | Decision | Rationale |
|---|---|---|
| D1 | Flutter app lives in **`flutter_app/`** at repo root on branch `flutter`. Web code at root stays untouched. | One repo, shared Supabase migrations, easy fixture sharing |
| D2 | **Reuse bundle id / applicationId `com.triptracker.app`** and the existing Firebase project | Ships as an *update* to current store listings; keeps push tokens valid. *Confirm with owner before Phase 12.* |
| D3 | State: **flutter_riverpod**. Navigation: **go_router**. Models: **freezed + json_serializable**. | Testable, idiomatic, AI-friendly |
| D4 | Local DB: **Drift (SQLite)** + explicit **outbox table** (mirror of web `syncQueue`) | Preserves offline-first parity |
| D5 | Backend client: **supabase_flutter**. Push: **firebase_messaging** + **flutter_local_notifications**. Deep links: **app_links**. | Same backend, same FCM tokens |
| D6 | Native capabilities: maps **maplibre** (native MapLibre); OCR **google_mlkit_text_recognition**; speech **speech_to_text**; QR **qr_flutter** + **mobile_scanner**; biometrics **local_auth**; secure storage **flutter_secure_storage**; contacts **flutter_contacts**; location **geolocator**; share **share_plus**; images **image_picker** + **flutter_image_compress**; PDF **pdfrx** | Replaces each Capacitor/web lib 1:1 |
| D7 | **No WebView wrapping** of the web app (except legal pages fallback if wanted) | The point is native UI |
| D8 | **Superadmin Ops Deck stays web-only.** Flutter only *reads* flags. `admin/*`, `SuperAdminBugTracker`, `SuperadminAuthModal` are out of scope. | Cuts ~25% of surface |
| D9 | Capgo OTA is dropped; store releases only (Shorebird optional later) | OTA code is a Capacitor concern |
| D10 | Min OS: **iOS 15+, Android API 24+** (confirm) | Package support |
| D11 | **Backend changes are additive only** (expand → contract). The deployed web app and shipped Capacitor builds must keep working throughout. | Web must not break |
| D12 | **Web is the spec.** Where web behaviour is a bug, log it and match the *intended* behaviour, not the bug. | Prevents drift |

## 4. Phases at a glance

Phase files: `phase-01-be-contract-freeze.md`, `phase-02-fe-foundation.md`, `phase-03-be-native-enablement.md`, `phase-04-be-sync-staging-rls.md`, `phase-05-fe-domain-data-sync.md`, `phase-06-fe-auth-trips.md`, `phase-07-fe-expenses-ledger.md`, `phase-08-fe-members-chat-notes.md`, `phase-09-fe-travel-pro-labs.md`, `phase-10-fe-settings-notifications-flags.md`, `phase-11-be-cutover-ops.md`, `phase-12-fe-qa-release.md`.

Track **BE** = backend/Supabase/contracts. Track **FE** = Flutter UI. Sizes are relative (S/M/L/XL), not calendar estimates.

| # | Track | Name | Size | Depends on | Can run in parallel with |
|---|---|---|---|---|---|
| 1 | BE | Contract freeze, inventory, golden fixtures | M | none | 2 |
| 2 | FE | Foundation: scaffold, design system, CI | M | none (reads Phase 1 output as it lands) | 1, 3, 4 |
| 3 | BE | Native enablement: auth, push, deep links, version gate | M | 1 | 2, 4 |
| 4 | BE | Sync/idempotency contract + staging + RLS tests | L | 1 | 2, 3 |
| 5 | FE | Domain core, Drift data layer, outbox sync, realtime | XL | 1, 2, (4) | 3 |
| 6 | FE | Auth, onboarding, trips list, trip stack, join/share | L | 3, 5 | 4 |
| 7 | FE | Expenses, ledger, settlements | XL | 5, 6 | 8 |
| 8 | FE | Members, groups, chat, notes/checklist, passes | XL | 5, 6 | 7 |
| 9 | FE | Travel, Pro & Labs features (map, live location, OCR, wrapped…) | XL | 7, 8 | 10, 11 |
| 10 | FE | Settings, notifications/push, flags, legal, feedback | L | 6 (parts need 7/8) | 9, 11 |
| 11 | BE | Cutover ops: legacy data, monitoring, rollback | M | 3, 4 | 9, 10 |
| 12 | FE | QA, native polish, accessibility, store release, sunset | L | 7–11 | none |

```
1 ─┬─> 3 ─┐
   ├─> 4 ─┼─> 5 ─> 6 ─┬─> 7 ─┐
2 ─┘      └──┘        └─> 8 ─┴─> 9 ─┐
                              └─> 10 ┼─> 12
                         3,4 ─> 11 ──┘
```

### Suggested assignment (a suggestion; only the dependency graph is binding)

| Agent | Phases | Why |
|---|---|---|
| Claude | 1, 3, 4, 5, 11 | Correctness-critical: contracts, SQL/RLS, sync engine, pure-logic ports with parity tests |
| Antigravity | 2, 6, 7 | Scaffold + large UI surfaces with visual verification |
| Cursor | 8, 9, 10, 12 | Broad UI feature work in an IDE loop |

Handoff between agents is **only** through the files in §7, never through chat memory.

## 5. Rules every agent must follow

1. **No commits, no pushes** until the repo owner says "commit and push" (`CLAUDE.md` rule). Work stays in the working tree. When the owner does commit: detailed commit body every time, and re-run lint/build/test as the literal last step before any push.
2. **Before any `git push`, ask the owner** whether the change is logged as bug fix (`bugs/bugs.json` + `BUGS.md`), feature (Superadmin feature tracking), or neither (`CLAUDE.md`).
3. **Plan before code.** At the start of your phase post a short plan (files, why, risks) and wait for go-ahead unless the owner pre-approved.
4. **Never edit web code (`src/`, `supabase/migrations/` already applied) except where your phase says so.** New migrations get the next number (`0111_…`), additive only, with a rollback note in the header comment.
5. **Do not hand-edit generated files** (freezed, drift, json_serializable output). Re-run build_runner.
6. **Parity is tested, not eyeballed.** Pure logic ports must pass the golden fixtures from Phase 1. UI parity is checked against the matching `FEATURE_TEST_STEPS.md` section.
7. **Respect feature flags.** The Flutter app never ships a code path for a flag-gated feature that ignores the flag. New *web* features still follow the `CLAUDE.md` flag rules; this migration adds none.
8. **Log decisions** as ADRs appended to `decisions.md` (context, decision, trade-offs).
9. **Quality gate per phase (FE):** `dart format --set-exit-if-changed .`, `flutter analyze` (zero issues), `flutter test`, debug Android build. iOS: Codemagic build must be green. **(BE):** migrations apply on a fresh local DB and on staging; RLS tests pass; web `npm run lint && npm run build && npm test` still green.
10. **Do not leave dev servers/emulators running** when finished.
11. If a phase file conflicts with reality in the repo, **trust the repo**, record the delta in `HANDOFF.md`, and carry on; stop and ask only for decisions that are the owner's (§8).

## 6. Scope tiers (what "parity" means)

| Tier | Contents | Ship gate |
|---|---|---|
| T1 | `core` + `trip` packs: auth, trips, members, groups, expenses, ledger/settlement, categories, chat, notes/checklist, notifications, settings, join/share | Required for first store release |
| T2 | `travel` pack: map, journey, passes wallet, weather, live location, OCR receipts, offline snapshot | Required before sunsetting Capacitor |
| T3 | `pro` pack: analytics, wrapped, FX, approvals, Splitwise import, packing assistant, etc. | Post-launch increments |
| T4 | `labs` pack | Only if flag is ON in prod; otherwise skip |
| — | `ops` pack / Ops Deck | Out of scope (D8) |

Phase 1 produces the exact flag→tier map; this table is the default.

## 7. Shared artifacts (the handoff protocol)

All live in `docs/flutter-migration/`. Phase 1 creates the first three; every later agent maintains them.

| File | Owner | Purpose |
|---|---|---|
| `contract/API_CONTRACT.md` | Phase 1 (BE adds changes) | Tables, columns, RLS summary, RPC signatures, realtime channels, storage buckets, edge functions, notification payloads |
| `PARITY_MATRIX.md` | Phase 1; updated by every FE phase | One row per web screen/feature → flag → tier → phase → status (`todo/wip/done/skipped+reason`) |
| `fixtures/` | Phase 1 | Golden JSON vectors exported from the TS logic; consumed by Dart tests |
| `HANDOFF.md` | **Every phase appends on completion** | Done, deviations, open questions, how to verify, what next agent must know |
| `ADR` entries | any | Appended to repo-root `decisions.md` |

**Phase completion = exit criteria in the phase file all met + `HANDOFF.md` entry appended.** The next agent starts by reading the last `HANDOFF.md` entry.

## 8. Decisions that belong to the owner (ask; do not assume)

1. Confirm D2 (reuse bundle id) and D10 (min OS).
2. Apple Developer / Google Play / Firebase / Supabase access: who provisions Sign in with Apple, APNs key, Play signing, a **staging** Supabase project.
3. Tier gating for first release (T1 only, or T1+T2).
4. Guest/demo users: migrate via backup import (default) or drop.
5. Sunset date for the Capacitor builds.

## 9. Top risks

| Risk | Mitigation |
|---|---|
| Sync/offline engine rewrite loses or duplicates data | Phase 4 idempotency contract; Phase 5 outbox with replay tests against staging; never share prod for tests |
| Silent logic drift (splits, settlement rounding, FX) | Golden fixtures from the TS code (Phase 1) enforced in Dart CI |
| Breaking the live web app via backend change | D11 additive-only; web CI run in every BE phase |
| Apple rejection (Sign in with Apple, account deletion, privacy labels) | Phase 3 + Phase 12 checklists |
| No local iOS build | Codemagic from Phase 2; weekly iOS build gate |
| Scope creep into Ops Deck / Labs | D8 + tiers |
| Local-only legacy data (guest/demo, unsynced queue) lost on switch | Phase 11 final Capacitor flush release + backup-import in Flutter |
| Realtime/RLS behaving differently on native sockets | Phase 4 two-user RLS/realtime tests; Phase 5 reconnect tests |
