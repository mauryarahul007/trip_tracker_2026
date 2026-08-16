# Capacitor Base Shell + Store-Ready Build Pipeline

**Status:** Approved for implementation planning
**Sub-project:** 1 of 3 in the mobile app store deployment initiative (Capacitor base shell → native Camera/Geolocation plugins → push notifications)

## Context

Trip Tracker 2026 is a Vite + React 19 + TypeScript SPA, offline-first (localStorage-persisted Zustand store), backed by Supabase (auth, Postgres, storage). It's already an installable PWA (manifest, service worker, iOS home-screen meta tags) but has never been packaged as a native app. The original `trip-tracker-plan.md` explicitly deferred native: "PWA first... native later only if required." That time has come — the goal now is Play Store and App Store distribution.

This spec covers only the first of three sub-projects: getting a store-installable native shell built, with the two things that would silently break inside that shell (build path, Google OAuth) fixed. Native Camera/Geolocation plugin swaps and push notifications are separate, later specs.

**Publishing itself (Play Console / App Store Connect account setup, listing content, submission, review handling) is explicitly out of scope and owned by the user.** This sub-project's deliverable is a build that is *ready* to publish — a signed `.aab` and `.ipa` artifact — not the act of publishing it.

## Goals

- Produce a working Capacitor-wrapped native shell for Android and iOS from the existing codebase, with no UI/feature rewrite.
- Fix the two things that break specifically because the app now runs from a native WebView instead of a browser tab: the GitHub-Pages-specific asset base path, and the browser-redirect-based Google OAuth flow.
- Produce placeholder-but-real app icons and splash screens (nothing exists today beyond an SVG favicon).
- Stand up a cloud CI pipeline (Codemagic) that produces signed, installable build artifacts for both platforms without requiring a local Mac — the user has an Apple Developer account but no Mac.
- Leave the existing web deployment (GitHub Pages) completely unaffected.

## Non-goals

- Native Camera plugin (receipt capture) — sub-project 2.
- Native Geolocation plugin (expense geotagging accuracy) — sub-project 2.
- Push notifications (new expense / settlement reminder / member joins) — sub-project 3.
- Camera/location permission strings and manifest entries — added in sub-project 2, not here (an unused permission is a common store-review rejection reason).
- Actually registering Play Console / App Store Connect listings, submitting for review, or store metadata (screenshots, descriptions, privacy policy text) — user-owned.
- Deep-link/universal-link handling for trip join codes (`ShareTripModal`'s `window.location.origin` share links) — those links still work by opening in a regular browser; making them open directly in the native app is future scope, not required for store readiness.

## Architecture

Capacitor wraps the existing production build (`dist/`) in a native WebView shell per platform. Two new native project directories are added to the repo root, generated once by the Capacitor CLI and then maintained directly (this is standard Capacitor practice — `android/` and `ios/` are real native projects, not generated-and-discarded artifacts):

```
trip_tracker_2026/
├── android/              # New: native Android project (Gradle/Kotlin)
├── ios/                  # New: native iOS project (Xcode/Swift)
├── capacitor.config.ts   # New: Capacitor config (appId, appName, webDir)
├── codemagic.yaml        # New: CI build config
├── src/                  # Unchanged, except authStore.ts (see below)
└── vite.config.ts        # Extended with a native build path
```

App ID: `com.triptracker.app` (permanent once published to either store — confirmed with user).

### Build path

`vite.config.ts` currently branches production builds to `/trip_tracker_2026/` (GitHub Pages project-site path) unless `VITE_BASE_PATH` is overridden — that override already exists for a separate EC2 deploy target, so this reuses an established pattern rather than introducing a new one. Add an `npm run build:native` script that sets `VITE_BASE_PATH=/` before `vite build`, and point `capacitor.config.ts`'s `webDir` at that build's output. `npx cap sync` copies `dist/` into each native project. The existing `npm run build` (GitHub Pages target) is untouched.

### OAuth fix

`authStore.ts`'s `signInWithGoogle` currently does a full-page redirect (`window.location.origin + redirectPath`) and relies on Supabase's default `detectSessionInUrl` browser behavior to recover the session from the URL on return. Inside a Capacitor WebView there is no stable `https://` origin for the OAuth provider to redirect back to, so this flow needs a platform branch:

- **Web (unchanged):** existing `signInWithOAuth` + full-page redirect.
- **Native (new):** open the Supabase OAuth URL via `@capacitor/browser`'s in-app browser (`ASWebAuthenticationSession` on iOS, Custom Tabs on Android — not the WebView itself, so third-party cookies/session state work correctly). Register a custom URL scheme (`com.triptracker.app://auth/callback`) in `Info.plist`/`AndroidManifest.xml` and add it as an allowed redirect URL in Supabase Auth settings. Listen for the return via `@capacitor/app`'s `appUrlOpen` event, extract the auth code/tokens from the callback URL, and complete the session (`supabase.auth.exchangeCodeForSession` or equivalent depending on the PKCE flow Supabase issues).

Detection of which branch to use: `Capacitor.isNativePlatform()` (from `@capacitor/core`), checked once in `authStore.ts`.

### Icons & splash screens

No PNG source exists — only `public/favicon.svg` (maskable, single-color-friendly) and the app's `#1F6E68` theme color. Use `@capacitor/assets` to generate the full required icon/splash size matrix from a rasterized version of the existing favicon on the theme background color. This is a placeholder — visually consistent with the existing brand, not a new design — swappable later by replacing the source image and re-running the same generation command, no code changes needed.

### CI/CD (Codemagic)

`codemagic.yaml` defines two build jobs:

- **Android:** runs on Codemagic's Linux/Mac pool, builds `dist/` via `npm run build:native`, `npx cap sync android`, then Gradle-assembles a signed `.aab` using a keystore stored as an encrypted Codemagic environment variable.
- **iOS:** runs on Codemagic's macOS pool (this is what removes the "no local Mac" blocker), same web build + `npx cap sync ios`, then Xcode-archives a signed `.ipa` using the user's Apple Developer account credentials (App Store Connect API key, stored as an encrypted Codemagic env var/integration — standard Codemagic↔App Store Connect integration, no manual certificate wrangling).

Both jobs trigger manually (Codemagic's "Start new build," or a `v*` git tag push) rather than on every `main` push — mobile release candidates are a deliberate, infrequent action distinct from the continuous web deploys `main` already drives, and this keeps the two pipelines decoupled. Output is a downloadable artifact. Actual upload-to-store-for-review is a manual step the user performs afterward (out of scope, per Goals).

### Versioning

`package.json`'s `version` field becomes the single source of truth. A small Node script (run as an early Codemagic build step) reads it and writes the corresponding native version fields: Android `versionName`/`versionCode` (in `android/app/build.gradle`) and iOS `CFBundleShortVersionString`/`CFBundleVersion` (in `ios/App/App/Info.plist`). `versionCode`/`CFBundleVersion` (the integer build numbers both stores require to strictly increase) are derived from the Codemagic build number, not hand-maintained.

## Error handling

- **OAuth callback failure** (user cancels, network drops mid-flow, malformed callback URL): surface the existing `authError` state in `authStore.ts` — no new error UI needed, the native branch feeds the same store field the web branch already does.
- **CI build failure** (signing misconfiguration, Gradle/Xcode compile error): fails the Codemagic job visibly with logs; no app-side handling needed since this never reaches a device.
- **Missing/invalid custom URL scheme registration**: would manifest as the OAuth browser never returning to the app. Mitigated by verifying the deep link round-trip manually on both platforms before considering this sub-project done (see Testing).

## Testing

- **Android:** buildable and testable locally without a Mac — install the Codemagic-produced `.aab`/a debug `.apk` on a physical device or emulator, verify: app launches, existing offline-first flows work unchanged (create trip, add expense, view balances), Google sign-in completes and returns to the app, base path resolves correctly (no broken asset loads).
- **iOS:** no local Xcode available, so verification happens via a Codemagic-built `.ipa` installed on a physical iPhone through TestFlight (Codemagic can upload directly to TestFlight as part of the pipeline) or ad-hoc distribution. Same manual checklist as Android.
- **Regression check on web:** confirm `npm run build` (GitHub Pages target) and the deployed site are unaffected — base path, OAuth flow, and existing PWA behavior on web must be unchanged.
- No new automated tests are introduced by this sub-project — it's native packaging and config, not application logic. The `authStore.ts` platform branch is the one piece of new logic; if it's written in a way that's unit-testable (e.g. the URL-parsing/session-exchange step extracted as a pure function), add a Vitest test for that function alongside the existing `authStore` tests if any exist — otherwise a manual verification pass on-device is the acceptance bar, consistent with how this repo has handled other platform-specific UI work (e.g. decision #21's Safari viewport fixes).
