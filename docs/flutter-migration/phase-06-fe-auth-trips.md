# Phase 6 (FE): Auth, onboarding, trips list, trip stack, join/share

**Track:** Flutter UI · **Size:** L · **Depends on:** Phases 3, 5 · **Parallel with:** 4 (if still open)
**Read first:** [README.md](README.md), `contract/AUTH_SETUP.md`, `contract/DEEPLINKS.md`, `PARITY_MATRIX.md` (rows for this phase).

## Goal
A user can install the app, sign in (Google / Apple / email), see and create trips, open a trip, join via link/code, and view public share pages: the app's front door and navigation spine. This phase also fixes the problem that motivated the migration: **trip-stack navigation and keyboard/viewport behaviour must be native-smooth on iOS**.

## Web sources to port
`LoginScreen`, `ResetPasswordScreen`, `RequireAuth`, `OnboardingSwipe`, `BiometricLockOverlay`, `SlideToUnlock`, `TripsListScreen` (1.5k lines: the largest), `TripStack`, `TripStartCard`, `BoardingPassHeroCard`, `NextUpTravelCapsule`, `DestinationInput`, `DateRangePicker`, `JoinTripScreen`, `JoinDeepLinkListener`, `TripSharePage`, `ShareTripModal`, `QrCodeView`, `DeleteAccountPage`, `NavTabs`, `HomeAmbientBackdrop`, `PullToRefreshIndicator`, `OfflineTravelBanner`, plus `src/App.tsx` shell logic (trip switching, tab swipe `useTabSwipe`, double-back-exit `doubleBackExit.ts`, `ghostExit.ts`, `tabTrail.ts`, `stackChrome.ts`, `tripStackMotion.ts`, `viewTransition.ts`).
Read: `docs/howto-navigate-and-manage-trip-stacks.md`, `docs/explanation-trip-stack-and-viewport-architecture.md`, `contract/IOS_DEFECTS.md`.

## Tasks

### 6.1 Auth UI
- Login: email/password, **Continue with Google** (native `google_sign_in` → ID token), **Sign in with Apple** (iOS; shown per Phase 3 policy), guest/demo entry per decision in `AUTH_SETUP.md`, forgot password, sign-up, error states (banned, paused sign-ups, network), copy identical to web (via l10n).
- Reset-password deep link screen. Session restore on cold start with a branded splash (no flash of login).
- Biometric lock (`local_auth`) + `SlideToUnlock`: parity with `BiometricLockOverlay` behaviour incl. timeout, fallback, and lock on background.
- Delete-account flow (in-app, required by Apple) calling `delete_own_account`; public `/delete-account` web page remains separate.
- Onboarding carousel (`OnboardingSwipe`), once-per-install via secure/pref storage.

### 6.2 Trips list (home)
Cards (`TripStartCard`, `BoardingPassHeroCard` incl. its light-on-dark luminance logic, `NextUpTravelCapsule`), sorting (`tripSort`), archive/close/freeze states, search/suggestions (`tripSuggest`), mute, swipe actions, pull-to-refresh, offline/sync status chip (`syncQueueLabel`), empty/first-run states, create-trip sheet (name, `DestinationInput` with place suggestions via `placeSuggest`/`placeGazetteer`, `DateRangePicker`, currency, cover image via `placeImageService` + caching), previous-members suggestions.

### 6.3 Trip stack & shell
- Native-feel trip stack (stacked cards/hero → trip) matching `TripStack`/`tripStackMotion`: implement with `CustomScrollView`/slivers + `Hero`/custom route transitions at 60/120fps. **No layout thrash from keyboard**: use `Scaffold.resizeToAvoidBottomInset` correctly; composer/fields tested with keyboard on iOS (Codemagic + device) against each `IOS_DEFECTS.md` item.
- Trip shell: header (back, title, settings entry, notification bell), bottom nav driven by flag-aware `visibleTripTabs` (Phase 5), **horizontal tab swipe** parity with `useTabSwipe` (including its edge-gesture/back-gesture conflict rules; iOS interactive-pop must still work), per-tab state preservation (`StatefulShellRoute`), android back / `doubleBackExit`.
- Tab placeholders for chat/expenses/ledger/members/notes (filled by Phases 7–8); settings route stub (Phase 10).

### 6.4 Join / share / live (public & deep-linked)
- `/join/:code`: works **logged out** (preview via `preview_trip_by_join_code`), then claim member (`claim_trip_member`) after login, handling "already a member", invalid/expired code, and `record_join_preview` analytics. Universal link + custom scheme + manual code entry + QR scan entry point (scanner implemented in Phase 8/9 can be stubbed with manual entry now).
- `/share/:token` read-only trip share (`get_trip_share`, `record_trip_share_view`), renders without auth.
- `/live/:token` read-only live-location page: shell + route here, the map implementation in Phase 9.
- `ShareTripModal`: generate/revoke share link (`generateTripShareLink`, `revokeTripShareLink`), QR (`qr_flutter`), invite via `share_plus`, contacts picker (`flutter_contacts`, permission rationale).
- `signupAttribution` capture from install referrer/deep link params (parity with web util).

### 6.5 Cross-cutting UI for this phase
Undo snackbars for archive/delete (5 s, per web), confirm dialogs, loading skeletons (`LuggageTagSkeleton`/`SheetSkeleton` analogues), offline banner, haptics, a11y labels, dark mode, text-scale 200%.

### 6.6 Tests
- Widget tests per screen state (loading/empty/error/offline). Golden tests for trip card variants (light/dark).
- `integration_test` flows on emulator/simulator against **staging**: sign-up → create trip → relaunch (session persisted) → logout; join-by-code logged-out → login → joined; share link opens read-only.
- Manual QA: execute the matching `docs/FEATURE_TEST_STEPS.md` sections; add Flutter-specific steps (keyboard, swipe, back gesture, biometric) **to the same file** per repo rule. Update `PARITY_MATRIX.md`.

## Deliverables
Screens + routes above, integration tests, updated parity matrix + test-steps doc, ADRs (route structure, trip-stack animation approach), `HANDOFF.md` entry.

## Out of scope
Expense/ledger/chat/member UI, push registration UI (Phase 10), maps (Phase 9).

## Exit criteria
- [ ] All T1 auth + trips + join + share rows in the parity matrix = `done` or `skipped+reason`.
- [ ] iOS: every keyboard/viewport/scroll item in `IOS_DEFECTS.md` relevant to these screens verified on a real device or Codemagic simulator video; failures filed.
- [ ] Cold-start to trips list < 2 s on a mid-range Android (profile build) with a seeded 20-trip account; trip stack scroll holds ≥ 55 fps (DevTools timeline noted).
- [ ] Logged-out `/join/:code` and `/share/:token` links open the app from a real universal link (or the Phase 3 host blocker is still open and recorded).
- [ ] `flutter analyze`, tests, Android build, Codemagic iOS build green.
