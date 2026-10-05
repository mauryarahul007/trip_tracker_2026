# Phase 3 (BE): Native enablement: auth, push, deep links, version gate

**Track:** Backend (Supabase + hosting config) · **Size:** M · **Depends on:** Phase 1 · **Parallel with:** 2, 4
**Read first:** [README.md](README.md), `contract/API_CONTRACT.md` (Phase 1). **Changes are additive (D11).**

## Goal
Make the existing backend welcome a second kind of client (native Flutter) without disturbing the web app or shipped Capacitor builds.

## Inputs
`contract/API_CONTRACT.md` §Auth/§Push/§Edge functions, `supabase/config.toml`, `supabase/functions/send-push/index.ts`, `src/utils/nativeAuth.ts`, `src/utils/joinDeepLink.ts`, `src/utils/deepLink.ts`, `src/services/pushRegistration.ts`, `pushApi.ts`, `ios/App/App/*.entitlements`, `android/app/src/main/AndroidManifest.xml`, `public/` (for well-known files), `.github/workflows/deploy-*.yml`.

## Tasks

### 3.1 Authentication
1. **Google native sign-in:** Flutter will use native Google Sign-In → ID token → `signInWithIdToken`. Configure the Supabase Google provider to accept the **iOS and Android client IDs** (and nonce handling) in addition to the web client. Document client IDs per flavor (dev/staging/prod) in `contract/AUTH_SETUP.md` (no secrets; reference where they live).
2. **Sign in with Apple:** Apple guideline 4.8 generally requires an equivalent option when Google login is offered. Verify against the current App Store guidelines, then enable the Supabase Apple provider (Services ID, Team ID, Key ID, key) and document the Apple Developer steps. Handle Apple's **private relay email** and first-login-only name delivery (profile `display_name` fallback; check the `handle_new_user` trigger copes with null name/email).
3. **Email/password + reset:** confirm redirect URLs allow the native scheme + universal link for `/reset-password`. Add them to the Supabase redirect allow-list for all environments.
4. **Captcha:** README says Turnstile is only on the superadmin login. Confirm Supabase-level captcha is **off** for normal sign-in (`config.toml` + dashboard setting). If any native-hostile captcha is on for regular auth, propose an alternative (App Attest / Play Integrity or disabling); do not break web.
5. **Guest/demo:** document how `guest`/`demo` providers work today (client-only?). Recommend the Flutter equivalent in `contract/AUTH_SETUP.md`; no backend change unless the guest flow needs server rows.
6. **Banned users / paused sign-ins:** ensure `signInsPaused` and `set_user_banned` are enforceable server-side for native clients too (not only via UI checks).
7. **Account deletion:** verify `delete_own_account` fully removes/anonymises user data (App Store requirement) including storage objects and push tokens; list gaps.

### 3.2 Push notifications
1. `device_push_tokens` currently `platform in ('ios','android')`, `unique(user_id, fcm_token)`. Additive migration: add nullable `client text` (`'capacitor'|'flutter'|'web'`) and `app_version text`, `last_seen_at timestamptz` (index on `user_id`). Keep old rows valid. Update the upsert RPC/policy so both clients can write (verify RLS on this table).
2. `send-push`: confirm it handles **iOS via FCM → APNs** correctly (APNs `aps` block, `apns-priority`, badge, `mutable-content` if the client wants attachments, `content-available` for background), and add the **`data` payload keys** that Flutter needs for tap-to-deep-link (`tripId`, `route`, `type`). Keep the existing keys for Capacitor.
3. **Dual-install de-dupe:** a user with both apps gets two pushes. Acceptable; add `last_seen_at` pruning of tokens unused for N days and prune on FCM `UNREGISTERED`/`NOT_FOUND` (check existing handling around line ~348).
4. Document the **Firebase project setup** for Flutter: reuse existing project (D2) → same `google-services.json` / `GoogleService-Info.plist`; APNs auth key uploaded in Firebase console. `contract/PUSH_SETUP.md`.
5. Verify digest/lifecycle/weather nudge functions only depend on `device_push_tokens` + `send-push` (so no change needed).

### 3.3 Deep links / universal links
Flutter needs HTTPS app links (`/join/:code`, `/share/:token`, `/live/:token`, `/reset-password`) + the custom scheme used for OAuth.
1. Produce **`apple-app-site-association`** (paths: the four above) and **`assetlinks.json`** (SHA-256 of Play signing + upload keys) and add them to `public/.well-known/` so every web deploy target (`deploy-pages`, `deploy-ec2`) serves them with `application/json` and **no redirect**. Note that GitHub Pages under a sub-path base (`/trip_tracker_2026/`) cannot serve `/.well-known` at domain root: document which host is the canonical domain for app links and what must change (custom domain). This is a likely blocker: raise it early in `HANDOFF.md`.
2. Document the **canonical URL formats** (and the Capacitor equivalents) in `contract/DEEPLINKS.md` so Flutter `go_router` matches them 1:1.
3. Confirm `record_join_preview`, `preview_trip_by_join_code`, `lookup_trip_by_join_code`, `get_trip_share`, `get_shared_location` work for **unauthenticated** callers (anon key), as the native "open link before login" flow needs them.

### 3.4 Minimum-version / kill switch
Flutter has no OTA. Add a server-controlled gate (reuse `app_config` / `get_app_config` if possible rather than a new table): `min_supported_version_ios/android`, `recommended_version_*`, `store_url_*`, `maintenance_message`. Anon-readable RPC, cached client-side. Replaces `UpdateBanner`/Capgo for Flutter users. Superadmin can edit it via existing `set_app_config`.

### 3.5 Client telemetry attribution
`growthApi`/`growthTelemetry` + `signupAttribution` exist. Add an optional `client` / `platform` / `app_version` field to telemetry/signup attribution RPC params (backward-compatible defaults) so ops can compare Capacitor vs Flutter funnels.

### 3.6 Migrations & docs
New migrations from `0111_` upward, one concern per file, each with header: purpose, backwards-compat note, rollback SQL. Update `contract/API_CONTRACT.md`. Edge function changes deployed to **staging first** (see Phase 4 for the staging project; if it does not exist yet, test with `supabase start` locally and note it).

## Deliverables
Migrations (`0111+`), edge-function patches, `public/.well-known/*`, `contract/{AUTH_SETUP,PUSH_SETUP,DEEPLINKS}.md`, contract updates, `HANDOFF.md` entry.

## Out of scope
Any Flutter code; changing RLS on business tables (Phase 4); the Apple/Google console actions themselves (document precisely, owner performs).

## Exit criteria
- [ ] Migrations apply on a fresh DB and on staging; **web app smoke (login, create trip, add expense, chat) passes** against the migrated DB.
- [ ] `npm run lint && npm run build && npm test` green.
- [ ] A scripted test inserts a `flutter` token and a `capacitor` token for one user; `send-push` reaches both (FCM dry-run / `validate_only`).
- [ ] `.well-known` files are served unredirected on the canonical domain (curl output in `HANDOFF.md`), or the blocker + required owner action is documented.
- [ ] Anonymous RPC calls for join/share/live return expected data/denials (documented transcript).
- [ ] Owner checklist of console tasks (Apple, Google, Firebase, Supabase) is complete and unambiguous.
