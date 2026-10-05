# Phase 12 (FE): QA, native polish, accessibility, store release, sunset

**Track:** Flutter UI + release · **Size:** L · **Depends on:** Phases 7–11 · **Parallel with:** none (final gate)
**Read first:** [README.md](README.md), `PARITY_MATRIX.md`, `contract/IOS_DEFECTS.md`, `ROLLOUT.md` (Phase 11), `flutter_app/docs/{PERMISSIONS,PRIVACY_LABELS}.md`.

## Goal
Prove parity, fix the long tail, pass store review, ship to the existing listings in stages, then retire the Capacitor wrapper.

## Tasks

### 12.1 Parity audit
Walk `PARITY_MATRIX.md` row by row. Each T1/T2 row must be `done` (with test-steps reference) or `skipped+reason` signed off by the owner. Produce `PARITY_REPORT.md`: counts per tier/status, list of intentional differences from web, list of deferred T3/T4 items.

### 12.2 Full manual QA
Execute **all** of `docs/FEATURE_TEST_STEPS.md` (web steps adapted + Flutter-specific additions) on a device matrix: iPhone small (SE-class), iPhone current, iPad (if supported, else letterbox decision), Android low-end (2–3 GB RAM), Android current, Android tablet/foldable sanity. Log failures in `bugs/bugs.json` format via the repo's `npm run bug:add` (web repo tooling; bugs for the Flutter app get a `client: flutter` tag/prefix: follow the existing schema, and ask the owner if the schema lacks a client field).
Re-verify every line in `IOS_DEFECTS.md` and mark pass/fail with evidence (video/screenshot).

### 12.3 Performance & stability budget
Profile-mode measurements recorded in `flutter_app/docs/PERF.md`: cold start, trips list, trip open, expense add, chat scroll, map hero, memory after 30 min, APK/IPA size (budget: set a target, e.g. APK ≤ 60 MB per ABI), jank percentage (DevTools), battery during live location. Fix regressions; use Impeller defaults, deferred components/tree-shaking icons, image caching limits, `const` audit, isolate heavy parsing (OCR parse, CSV, Splitwise import) off the UI thread.

### 12.4 Accessibility & internationalisation
VoiceOver/TalkBack pass on: login, trips list, add expense, settle up, chat send, join by code. Dynamic type up to 200%, contrast ≥ 4.5:1 (token audit), reduce-motion, focus order, semantic labels on icon buttons, haptics off option. RTL smoke test (layout doesn't break even if only `en` ships). Document gaps.

### 12.5 Security hardening
Release builds: obfuscation + split debug info (`--obfuscate --split-debug-info`) with symbol upload to the crash tool; certificate/TLS defaults; `flutter_secure_storage` options (iOS keychain accessibility, Android `EncryptedSharedPreferences`/Keystore); disable screenshots/preview on sensitive screens (document vault/boarding pass) if web does; no secrets in the binary (scan IPA/APK `strings`); jailbreak/root detection **not required** unless owner asks; dependency audit (`dart pub outdated`, known CVEs); Android `allowBackup` and network security config review.

### 12.6 Store readiness (owner holds the accounts; you prepare everything)
- **Both stores:** app name/subtitle, description, keywords, screenshots (generate from real data on seeded staging, per device class), preview video optional, support URL, privacy policy URL (web `/privacy`), age rating, release notes ("a completely new native app"), category unchanged.
- **iOS:** `Info.plist` usage strings from `PERMISSIONS.md`, background modes (location, remote-notification) justification text, Sign in with Apple compliance, **privacy nutrition label** from `PRIVACY_LABELS.md`, App Tracking Transparency only if tracking (expected none), in-app account deletion present, export compliance (HTTPS only → exempt), entitlements (push, associated domains with the **real** AASA host from Phase 3), TestFlight external beta review notes with a **demo account** for reviewers.
- **Android:** target API level current requirement, Play **Data safety** form, background-location declaration video + justification (if 9B ships), foreground-service type declarations, app signing by Play, `.aab` build, deep link `assetlinks.json` verified, 64-bit, permissions minimal (audit merged manifest).
- Same bundle id/applicationId and **version codes above the last Capacitor release** (bump rules in `flutter_app/README.md`; sync with `scripts/sync-native-version.mjs` logic: Flutter reads `pubspec.yaml`).

### 12.7 CI/CD for release
Codemagic: `flutter-ios-release` (signing via App Store Connect API key, auto build number, TestFlight upload) and `flutter-android-release` (keystore from Codemagic secrets, `.aab` to Play internal track). Tagged releases only; protected secrets; release job runs analyze + tests + fixtures first. Document the manual promotion steps.

### 12.8 Staged rollout (execute `ROLLOUT.md`)
Internal → closed beta (owner + invited users, real trips, the final Capacitor flush-release live) → 10% → 50% → 100%, with go/no-go metrics at each stage (Phase 11). Hold at each stage ≥ the soak time the owner approves. Triage live bugs daily during beta.

### 12.9 Capacitor sunset
After 100% and the agreed soak: (1) flip server config so old builds show the migration banner/force-update per owner decision; (2) **only after** the contract-freeze window ends, open a *separate, owner-approved* change set to archive Capacitor assets (`android/`, `ios/`, `capacitor.config.ts`, Capgo, `@capacitor/*` deps, native CI workflows, `liveUpdate.ts`) from the web app: **the web app itself stays**. Do not delete anything in this phase without explicit approval; list candidates in `SUNSET_CANDIDATES.md`.

### 12.10 Close-out
Update `README.md` (repo root), `FEATURES.md` structure for two clients, `decisions.md` ADR "Flutter migration outcome", retrospective notes in `HANDOFF.md` (what worked, what to change), backlog of deferred T3/T4 items in `BACKLOG.md`.

## Deliverables
`PARITY_REPORT.md`, QA evidence, `PERF.md`, accessibility report, store listings + metadata pack, release pipelines, rollout log, `SUNSET_CANDIDATES.md`, ADR, `HANDOFF.md` entry.

## Out of scope
New features; deleting Capacitor code without explicit approval; Ops Deck.

## Exit criteria
- [ ] Parity report signed off by the owner; zero open P0/P1 bugs; P2s triaged.
- [ ] `IOS_DEFECTS.md` fully green with evidence.
- [ ] Perf budget met on the low-end device list.
- [ ] Both stores approved; staged rollout reached 100% with go/no-go metrics met at each stage.
- [ ] Rollback drill rehearsed (config flips + halted rollout) on staging.
- [ ] Sunset candidates documented; nothing deleted without approval.
