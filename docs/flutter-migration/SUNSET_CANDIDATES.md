# Capacitor sunset candidates (Phase 12.9)

**A list only. Nothing here is deleted, and nothing may be deleted without your explicit approval, and not before the contract-freeze window ends (`ROLLOUT.md` section 3).** The web app stays: it is what the browser uses and what the Capacitor shell wraps. The goal of the later change set is to remove the **native wrapper**, not the web product.

## Order of operations (from the phase plan)
1. After 100% rollout plus the agreed soak: flip server config so remaining Capacitor builds show the migration notice or "Update required" (`app_config`, see `contract/FINAL_CAPACITOR_RELEASE.md`). No code deleted.
2. Wait for the freeze window to end (>= two store release cycles) **[Owner sets the date]**.
3. Only then, a **separate, owner-approved change set** removes the items below, one group per commit, web CI green after each.

## Candidates (read from the repo at 3.45.0)
| Group | Items | Notes / risk |
|-------|-------|--------------|
| Native projects | `android/`, `ios/` (the Capacitor ones at the repo root; not `flutter_app/android` or `flutter_app/ios`) | Contains the committed Firebase client files for `com.triptracker.app`. **Copy them into `flutter_app` first** (B-182) |
| Config | `capacitor.config.ts` | |
| Dependencies | `@capacitor/*` (android, app, browser, camera, cli, core, geolocation, haptics, ios, keyboard, local-notifications, push-notifications, status-bar), `@capacitor-community/contacts`, `@capacitor-community/speech-recognition`, `@capgo/capacitor-updater`, dev dependency `@capacitor/assets` and the `generate:assets` script | The web code imports `@capacitor/core` in about 20 files (`Capacitor.isNativePlatform()` guards). Removing the package needs those call sites replaced by a tiny stub first, or the web build breaks |
| Web code behind native guards | `src/utils/liveUpdate.ts`, `nativeShell.ts`, `pushRegistration.ts`, parts of `haptics.ts`, `geolocation.ts`, `speechRecognition.ts`, `passReminders.ts`, `webNotifications.ts`, `appVersion.ts`, `diagnosticLogger.ts`, `main.tsx`, and native branches in `authStore.ts`, `notificationsStore.ts`, `supabaseClient.ts`, several components | Keep web behaviour identical; delete only the native branches. Each has tests; run them |
| Over-the-air update path | `scripts/package-update.sh`, the `/updates/latest.json` publish step in `deploy-ec2.yml` | **Stop publishing last**: it is how the final Capacitor release and any emergency notice reach installed apps |
| Native build CI | `.github/workflows/build-android.yml`, `build-ios.yml`; Codemagic workflows `android-release`, `android-debug`, `ios-release`, `ios-simulator`; `scripts/sync-native-version.mjs`, `scripts/build-native.mjs`, `scripts/align-spm-versions.mjs`, `cap:sync` | Keep the Flutter workflows. `sync-native-version.mjs` also defines the build-number scheme the Flutter release reuses (`tool/release_version.sh`): move that logic, do not lose it |
| Docs | Capacitor and iOS-WebView explanations (`docs/explanation-mobile-compositor-and-webkit-performance.md`, `docs/explanation-trip-stack-and-viewport-architecture.md`, `docs/howto-*` for native builds), `CLAUDE.md` and `README.md` sections on native builds | Archive rather than delete if they explain history |
| Server data | `device_push_tokens` rows with `client = 'capacitor'` | Leave: harmless, pruned automatically |

## Do not remove
The web app, the Supabase backend and migrations, the Ops Deck, `scripts/export-golden-fixtures.mjs` (Flutter fixtures come from the web source), the web service worker.

## Pre-conditions checklist (all must be true)
- [ ] Flutter at 100% for the agreed soak with go/no-go metrics met
- [ ] No Capacitor user population above the owner's threshold (DAU by client, `ops/observability.sql` 1)
- [ ] Guest and vault export period over (`contract/LEGACY_DATA.md`)
- [ ] Firebase files copied into `flutter_app` (B-182)
- [ ] Owner approval recorded here: ______ (date) by ______
