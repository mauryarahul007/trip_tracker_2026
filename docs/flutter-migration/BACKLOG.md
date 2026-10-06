# Flutter migration backlog (not done / not verified)

Living list of everything that was **deferred, skipped, or built but never verified** during the Flutter migration. Add an entry the moment something is left out of a build or is not being worked on, for every phase (including phases that have not started). Tick it (and note the commit/ADR) when closed. Phase `HANDOFF.md` entries describe what shipped; this file is the single place to find what is still owed.

**How to read:** `Status` = `open` (nothing done), `unverified` (built, not run on a real device/staging), `deferred` (deliberately postponed). `Blocker` says what you need before it can be closed. `Owner phase` = where it naturally gets done.

## Verification gaps (built, never run for real)

| ID | From | Item | Status | Blocker | How to close | Owner phase |
|----|------|------|--------|---------|--------------|-------------|
| B-001 | P5 | Staging sync suite (`test/staging/sync_staging_test.dart`): offline create + expense, flush, duplicate replay, assert one server row. Must pass **twice in a row** | unverified | No staging Supabase project / Docker / Supabase CLI on the dev machine | Provide staging URL + anon key + seeded persona (`contract/STAGING_SETUP.md`), run `flutter test --tags staging --dart-define=STAGING_*` | 5 (exit criterion), 11 |
| B-002 | P5 | Headless CLI harness (sign in, sync seeded trip, add expense offline, reconnect, see it server-side) | open | Same as B-001 | Covered by B-001's test; add a small `tool/` script only if wanted | 5 |
| B-003 | P5 | Two-device concurrent edit, kill-app-mid-flush, token-expiry-mid-sync scenarios against staging | open | B-001 | Extend the staging suite | 5, 11 |
| B-004 | P6 | Nothing has run on an Android emulator/device or iPhone; only widget tests exist | unverified | Android SDK not installed; no Mac | Install Android SDK / use Codemagic iOS build, run `FEATURE_TEST_STEPS.md` -> FLUTTER-P6 | 6, 12 |
| B-005 | P6 | iOS keyboard / viewport / safe-area items from `contract/IOS_DEFECTS.md` for login, trips list, sheets | unverified | Needs iOS device or Codemagic simulator video | Walk each item, file failures | 6, 12 |
| B-006 | P6 | iOS: left-edge swipe on non-first trip tabs pages tabs instead of interactive pop (ADR 263) | unverified | iOS device | Test on device; if bad, restrict pager start zone or disable swipe within ~24px of the edge | 6, 12 |
| B-007 | P6 | Performance: cold start to trips list < 2 s (mid-range Android, profile build, 20 trips), trip list scroll >= 55 fps | open | Android device | Measure with DevTools, seed 20 trips | 6, 12 |
| B-008 | P6 | Integration tests (`integration_test`) on emulator against staging: sign-up -> create trip -> relaunch persists -> logout; join logged-out -> login -> joined; share link read-only | open | B-001, B-004 | Write after a staging project and emulator exist | 6 |
| B-009 | P6 | Google sign-in end to end | unverified | OAuth clients not created; `GOOGLE_SERVER_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` not set (see `contract/GOOGLE_OAUTH_SETUP.md`) | Create clients, add to Supabase provider, test on a Play-services device | 6 |
| B-010 | P6 | Sign in with Apple end to end (iOS only) | unverified | Apple Developer account, App ID capability, Supabase Apple provider | Follow `contract/AUTH_SETUP.md` §2, test on iPhone | 6 |
| B-011 | P6 | Password-reset email deep link opens the app and shows "choose a new password" | unverified | Supabase redirect URL must include `com.triptracker.app://reset-password`; device test | Add redirect URL in Supabase Auth settings, test | 6 |
| B-012 | P6 | Biometric app lock on a real device (Face ID / fingerprint prompt, 30 s timeout) | unverified | Device with biometrics | Run FLUTTER-P6 section B | 6 |
| B-013 | P6 | `delete_own_account` flow against a real project | unverified | Staging project | Use a throwaway account on staging | 6 |
| B-014 | P6 | Universal / App Links (`https://trip-tracker.blackmaroon.in/join/...`) | open | Custom domain serving `/.well-known/apple-app-site-association` and `assetlinks.json` (no redirects, `application/json`), iOS Associated Domains entitlement (`applinks:`) not added | Host the files, add entitlement in Xcode, verify with `adb shell pm get-app-links` / Apple's validator. Custom scheme links work meanwhile | 3 (infra), 6 |
| B-015 | P6 | iOS: reversed Google client ID URL scheme in `Info.plist` | open | Needs the iOS client ID (B-009) | Add under `CFBundleURLTypes` | 6 |
| B-016 | P5/6 | Android release build and Codemagic iOS build never run for this code (new plugins: google_sign_in, sign_in_with_apple, local_auth, app_links, share_plus) | unverified | Toolchains | Run `flutter build apk --debug` and the Codemagic workflow; fix manifest/Podfile issues | 6, 12 |
| B-017 | P6 | `local_auth` platform config (Android `USE_BIOMETRIC` permission / `FragmentActivity`, iOS `NSFaceIDUsageDescription`) | open | Needs a build to confirm | Add permission + plist string, verify prompt appears | 6 |

## Features and scope deferred

| ID | From | Item | Status | Why deferred | How to close | Owner phase |
|----|------|------|--------|--------------|--------------|-------------|
| B-020 | P5 | SQLCipher / encrypted storage for document vault and pass attachments | deferred | Manual passes shipped in Phase 8 without attachments (ADR 267). Vault stays off. | Decide SQLCipher vs key-in-secure-storage when the vault flag is built | 9 |
| B-021 | P5 | Background sync (`workmanager`: iOS BGAppRefresh / Android WorkManager) | deferred | Foreground sync is the contract; best-effort only | Add plugin, document platform limits | 11/12 |
| B-022 | P5 | Repositories not built yet: profile, locations, growth telemetry, bugs/feedback, notifications (read side), push tokens | deferred | Messages (text) and passes (collab JSON) shipped in Phase 8. Receipts and settlements shipped in Phase 7. | Add the rest with their phases | 9-10 |
| B-023 | P5 | Realtime: typing/presence channels (`trip_chat_typing`, `trip_presence`) | deferred | Text chat shipped without typing or presence (ADR 267) | Add when those labs flags are turned on | later |
| B-024 | P5 | ~~Sync conflict resolver UI (data is exposed as a stream)~~ | **closed (P7 slice E)** | Ledger sheet: keep mine dismisses; keep theirs calls `adoptServerCopy` (B-060) | n/a | 7 |
| B-025 | P5 | ~~Tombstones hard-delete expenses, so the 24 h recycle bin is not mirrored to other devices~~ | **closed (P7 slice A)** | Pull sync now also reads soft-deleted rows (`recycledExpenses`) and keeps them restorable; covered by a pull test | n/a | 7 |
| B-026 | P5 | Outbox payload compaction (add then edit of the same pending expense stays as two items) | deferred | Works, just chattier | Coalesce per entity in `OutboxStore.enqueue` | 11 |
| B-027 | P5 | Domain-layer purity lint is a test, not an analyzer rule | deferred | Test enforces it | Optional custom lint | 12 |
| B-030 | P6 | Trips home is a list; the web's 3D stacked-card trip stack is not built | deferred | Large visual port; Hero title transition used instead | Build stacked cards with slivers; measure 55 fps | 6 / 12 |
| B-031 | P6 | Trip cards lack cover photo, `BoardingPassHeroCard`, `NextUpTravelCapsule`, destination photo service/cache | deferred | Needs image services (`placeImageService`) | Port with caching | 6 / 9 |
| B-032 | P6 | Destination autocomplete / place gazetteer (`placeSuggest`) in create-trip; previous-members suggestions; clone-squad | deferred | `placeGazetteer` not ported | Port module + fixtures | 6 |
| B-033 | P6 | Trip list actions are owner-only; trip admins cannot archive/delete; freeze/close have no UI | deferred | Needs members + settings | Add admin check via members, freeze/close in trip settings | 10 |
| B-034 | P6 | Trip settings screen is a stub | deferred | Phase 10 | Build settings | 10 |
| B-035 | P6 | Notification bell in the trip header | deferred | Notifications UI is Phase 10 | Add bell + unread badge | 10 |
| B-036 | P6 | App-lock enable/disable toggle has no UI (preference is only readable) | deferred | Settings screen | Add toggle calling `BiometricLockEnabled.setEnabled` | 10 |
| B-037 | P6 | QR scanner for joining a trip | deferred | Needs `mobile_scanner` + camera permission. Not in the Phase 8 build. | Add scanner, route result to `/join/:code` | 9 |
| B-038 | P6 | Contacts picker in the invite sheet (`flutter_contacts` removed for now) | deferred | Phase 8 invite reuses the share sheet. Contacts stay out. | Add package + iOS/Android permission strings + rationale | later |
| B-039 | P6 | `/live/:token` read-only live-location page is a shell | deferred | Map is Phase 9 | Implement with MapLibre | 9 |
| B-040 | P6 | Invite-conversion growth behaviour (`enableInviteConversion` default attribution on join, `get_public_growth_flags`) | deferred | Growth flag plumbing not ported | Port `fetchPublicGrowthFlags` + attribution default | 10 |
| B-041 | P6 | Share-link/invite push notification to existing members when someone joins (`member_joined`) | deferred | Push sending is Phase 10 | Call `send-push` after claim | 10 |
| B-042 | P6 | Per-trip default landing tab and `enableTabBackHistory` / `enableDeepLinkedTabs` flags not read; trail cap is fixed at 5 | deferred | Flags unchecked | Read the flags, mirror web | 10 |
| B-043 | P6 | Dark mode, 200% text scale and a11y audit of new screens | open | Only widget-tested at one size/theme | Add golden tests (light/dark) for trip card variants; manual audit | 6 / 12 |
| B-044 | P6 | l10n: only English; some Phase 2 strings (smoke test, legal screens) still hard-coded | deferred | Single locale for now | Move remaining strings, add locales when needed | 12 |

## Phase 7 additions

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-050 | `expense_form_logic.dart` (validation, base-currency conversion, multi-payer allocation, approval rule) is **hand-transcribed** from `ExpenseForm.tsx`/`tripStore.ts`, not fixture-generated (the web code is inline in a component). Covered by 26 hand-derived tests | unverified | Extract the pure parts into a web util (behaviour-neutral) and export fixtures, or generate cases by driving the component | 7 |
| B-051 | `expense_list_logic.dart` (filters, day groups, totals, attention chips, row review) hand-transcribed from `App.tsx`/`ExpenseList.tsx`/`SummaryAttentionStrip.tsx`; 22 hand-derived tests | unverified | Same approach as B-050 | 7 |
| B-052 | Receipt photo is not shown anywhere yet (detail sheet shows no image); capture/pick UI is slice C; no signed-URL fetch for stored receipts or local preview | done | Detail sheet shows the staged local file, an http path, or a 1 h signed `receipts` URL | 7 |
| B-053 | `enableStickyDayHeaders`: not implemented. A pinned `SliverPersistentHeader` inside `SliverMainAxisGroup` trips a SliverGeometry assertion (layoutExtent > paintExtent) | done | Flat slivers (not inside `SliverMainAxisGroup`); the day header is 48px tall so layoutExtent matches paintExtent. Flag stays OFF | 7 |
| B-054 | Row swipe vs tab swipe: the web lets a 28 px edge zone start a tab swipe over a swipeable row (`EDGE_ZONE_PX`); in Flutter a horizontal drag that starts on a row is always the row's swipe, so tabs change only from outside rows | done | 28px opaque strips on both edges of each row. Device check is in FLUTTER-P7-LOOP | 7 |
| B-055 | Push notifications for expense added / settlement confirmation requested (`sendPushNotification` -> `send-push`) are not sent | deferred | Phase 10 push work | 10 |
| B-056 | Divergence: saving a split with no active members returns an error ("Select at least one active traveler to split with."); the web silently does nothing | accepted | Intentional UX fix; revisit if strict parity is required | 7 |
| B-057 | Cross-trip expense search (`enableCrossTripSearch`) and the web's collapsible stats "chrome" are not ported; Flutter always shows the summary card | done | Search (flag OFF) lists matches from other local trips. Compact summary is flag-gated | 7 |
| B-058 | `enableCompactSummary`, `enableCategoryColorRings`, `enableMotionPolish` presentation flags are not honoured by the new rows | done | Compact summary, color rings, and compact ledger are gated. Motion polish stays a later visual pass | 12 |
| B-059 | Dispute / approve / confirm-settlement are online-only (parity with the web): they fail with "You're offline" instead of queueing | accepted | Queue them via the outbox if offline use becomes a requirement (the RPCs are replay-safe, 0115) | 7 |
| B-060 | Conflict badge only appears after a pull reports a conflict; the resolver UI (B-024) is not built | done | Ledger sheet: keep mine dismisses; keep theirs calls `adoptServerCopy` | 7 |
| B-061 | Test harness note: Drift streams created under `FakeAsync` can stall a following transaction. Widget tests must use `real()`/`settle()` from `test/support/pump_app.dart`; two writes in one `real()` block can hang | known | Document for new tests (done in HANDOFF) | n/a |
| B-062 | Divergence: Shares (weights) split now persists its weights (`splitConfig`); the web dropped them, which made edits reset to equal | accepted | Web bug; fix web to match if desired | 7 |
| B-063 | Expense form uses built-in/custom exchange rates only; the web's live `fetchExchangeRates` is not called | done | Frankfurter USD rates, 24h cache, offline fallback to `defaultExchangeRates`; custom trip rates still win | 7 |
| B-064 | Expense form: geotag / location search, receipt OCR and voice input are not built | open | Phase 9 (travel/pro) | 9 |
| B-065 | Expense form: the web's presets tip and one-time nudge are not ported | open | Low value; port with onboarding tips | 7 |
| B-066 | Ledger tab built (balances, who-pays-whom, simplify toggle, settle up with partial amount + date/note, history, confirm via detail sheet). NOT built: UPI payment sheet, settlement share-card PNG, trip close-out modal, cross-trip balances, sticky balance bar, collapsible sections, conflict resolver UI | done | UPI (prefs, not a member column), share PNG, close-out, cross-trip nets, sticky bar, collapsible sections | 7 |
| B-067 | Category management (create/edit/delete/reorder UI), CSV export, backup import/export, Splitwise import, analytics (T3, needs `fl_chart`) and the smart quick-add modal UI are not built (pure logic for imports/exports exists in `imports_and_exports.dart`) | done | Categories, CSV, JSON backup, Splitwise (flag OFF), text quick-add. Analytics stays B-070 | 7 |
| B-068 | No screen-level golden-fixture balance test, no golden images, no 200%-text-scale pass, no 500-expense performance profile | done | Widget test asserts ₹60/₹30 strings, 200% text scale, and a 500-row list that offers Load more. Device fps is a manual step in FLUTTER-P7-LOOP | 7 |
| B-069 | `ReceiptStore.stage` uses synchronous file copy (<= 5 MB cap) because async file I/O never completes under the widget-test fake clock | accepted | Revisit if large photos cause jank | 7 |
| B-070 | Burn-rate and multi-trip analytics charts (`fl_chart`) were not built in Phase 7 | deferred | T3; add charts in a later slice if the pack is turned on | 9 |
| B-071 | Device checks still open after the widget tests: 500-row scroll fps, ledger open under 300 ms, TalkBack/VoiceOver on add-expense and settle | unverified | Needs a device. Widget coverage is B-068. Steps are in FLUTTER-P7-LOOP | 7, 12 |

## Phase 8 additions

Text chat, roster, checklist, notes, and manual passes shipped (ADR 267). These were left out of that build.

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-080 | Two-account staging: chat lines and concurrent checklist edits converge like the web; 20 offline sends do not duplicate | unverified | Needs a staging project (same limit as B-001). Steps in FLUTTER-P8 | 8, 11 |
| B-081 | A 1,000-message thread scrolls at about 55 fps | unverified | Device profile build. The widget test only checks a short thread | 8, 12 |
| B-082 | iOS chat composer stays above the keyboard (`IOS_DEFECTS.md`) | unverified | iPhone or Codemagic simulator video. B-005 covers login and the trips list, not chat | 8, 12 |
| B-083 | Per-member date ranges (`enableDateRangeMembership`, default off) | deferred | Flag stays off. No date modal on the roster | 8 |
| B-084 | Chat reactions and replies (`enableChatReactionsAndReplies`) | deferred | Flag stays off. Text send/edit/delete only | 8 |
| B-085 | Chat image attachments (`enableChatAttachments`) | deferred | Flag stays off. No camera or gallery attach, no upload progress | 8 |
| B-086 | Chat voice notes (`enableChatVoiceNotes`) | deferred | Needs `record` / playback and a device. Flag stays off | 8 |
| B-087 | Server read receipts (`enableChatReadReceipts`) | deferred | Unread is a local last-seen id. No `trip_chat_read_cursors` write | 8 |
| B-088 | Tripbot natural-language expenses (`enableTripbotNlExpenses`) | deferred | Flag stays off. No parser in the composer | 8 |
| B-089 | Member last seen (`enableMemberLastSeen`) | deferred | Not on the roster or in chat | 8 |
| B-090 | Pass scanner, PDF import, and screen-brightness boost | deferred | Manual flight/train/hotel add shipped. No `mobile_scanner`, `pdfrx`, or brightness API. Boarding-gate scan is B-101 | 8, 9 |
| B-091 | Full packing assistant modal | deferred | Suggest packing adds the local suggestion list only. The web modal and any remote/LLM path are not ported | 8, 9 |

## Phase 9 (not started)

Travel, Pro, and Labs beyond what Phases 7–8 already shipped. Each item stays behind its existing flag. Do not rebuild server calendar sync.

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-100 | Maps and journey: trip map, route stops, geotagged expense pins, destination photos, offline tiles, map collapsed by default | open | Phase 9A. MapLibre. Place search overlaps B-032 | 9 |
| B-101 | Boarding-pass gate scanner (`enableGateScanner`) | open | Camera scan into the pass wallet. Join-trip QR is B-037, not this | 9 |
| B-102 | Flight radar status (`enableFlightRadar`) | open | Phase 9 travel status | 9 |
| B-103 | Add-to-calendar / ICS export (`enableIcsExport`) | open | Share an `.ics` file. Do not rebuild the removed server calendar sync | 9 |
| B-104 | Live location share, heartbeat, member map, and a finished `/live/:token` page (`enableLiveLocationShare`) | open | Phase 9B. The page is still a shell (B-039). Background location and the privacy indicator are part of this | 9 |
| B-105 | Weather itinerary nudges (`enableWeatherItineraryNudges`) | open | Port `weatherService` with cache. No location permission | 9 |
| B-106 | Offline trip snapshot (`enableOfflineSnapshot`) | open | Export/import a snapshot and show the offline banner | 9 |
| B-107 | Trip Wrapped slides and share image (`enableTripWrapped`) | open | Phase 9D. Flag is default on in the registry; there is no screen | 9 |
| B-108 | Achievements and badges (`enableAchievements`) | open | Labs. Port only if the owner turns the flag on | 9 |
| B-109 | Traveler passport (`enableTravelerPassport`) | open | Labs. Same gate as B-108 | 9 |
| B-110 | Next Up capsule and progressive Next Up (`enableNextUpCapsule`, `enableProgressiveNextUp`) | open | Trip cards still lack this (also B-031) | 9 |
| B-111 | Keyword tagging (`enableKeywordTagging`) | open | Labs. Category keywords from the web util | 9 |
| B-112 | Auto currency detection (`enableAutoCurrencyDetection`) | open | Pro. Country map exists in domain logic; the form does not use it | 9 |
| B-113 | Expense photo linking (`enableExpensePhotoLinking`) | open | Pro. Receipt upload exists; linking a photo as the web does is not built | 9 |
| B-114 | Command palette | deferred | Phase 9D says omit on mobile unless the parity matrix requires it. No matrix row today | 9 |
| B-115 | Trip media gallery extras | open | Phase 9D. Image attach in chat is B-085 | 9 |

## Phase 10 (not started)

Settings, notifications, push, flags in the UI, feedback, and profile. Pieces already owed: settings stub (B-034), notification bell (B-035), app-lock toggle (B-036), expense/join push (B-055, B-041), profile and push-token repositories (B-022).

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-120 | Push end to end: FCM/APNs, token register and unregister, tap-through deep link, foreground banner | open | Phase 10.1. Device matrix in the phase file | 10 |
| B-121 | In-app notification list, grouping (`enableNotificationGrouping`), mark read | open | Read repository is B-022 | 10 |
| B-122 | Quiet hours, digest, and per-trip mute (`enableQuietHours`, `enableDigestNotifications`) | open | Server prefs, same as web | 10 |
| B-123 | Local pass and settlement reminders | open | `flutter_local_notifications`, reschedule on boot, honour quiet hours | 10 |
| B-124 | Full settings tree: profile, appearance, haptics, currency, storage, trip tools, about, diagnostics | open | Replaces the settings stub (B-034) | 10 |
| B-125 | AMOLED theme (`enableAmoledTheme`) | open | Pro. Tokens exist; the theme is not wired | 10 |
| B-126 | Data saver mode (`enableDataSaverMode`) | open | Pro. Settings row | 10 |
| B-127 | Min-version gate and maintenance banner (fail open offline) | open | Phase 10.4 | 10 |
| B-128 | Bug report and feature request (`enableFeatureSuggestions`), including screenshot and log attach | open | Phase 10.5. PII scrub required | 10 |
| B-129 | What's New hub (`enableWhatsNewHub`) | open | Labs. Changelog content from the web | 10 |
| B-130 | Growth telemetry and lifecycle nudges (`enableGrowthTelemetry`, `enableLifecycleNudges`) | open | Consent and flag gated. Buffered offline | 10 |
| B-131 | Sync queue inspector (`enableSyncQueueInspector`) | open | Pro. Debug/staging surface for the outbox | 10 |
| B-132 | Demo data seeding (`enableDemoSeeding`) | open | Labs. Ops-style seed, not a traveler default | 10 |
| B-133 | Trip stack alphabetical sort (`enableTripStackSort`) | open | Pro. The 3D stack itself is B-030 | 10 |
| B-134 | Extended undo (`enableExtendedUndo`) | open | Core flag default on; the longer undo window is not ported | 10 |
| B-135 | Motion polish (`enableMotionPolish`) | deferred | B-058 shipped the other presentation flags. This visual pass was left | 12 |

## Phase 11 (not started)

Cutover ops. Nothing in this phase has been written yet.

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-140 | Legacy-data inventory (`contract/LEGACY_DATA.md`): unsynced Capacitor queue, guest trips, vault, local prefs | open | Phase 11.1 | 11 |
| B-141 | Final Capacitor release spec: flush queue, migration banner, export for guest/vault data | open | Spec only until the owner approves the web change | 11 |
| B-142 | Backup import contract for Flutter (id collisions, idempotent re-import) | open | Phase 10 builds the UI; this phase defines the contract | 11 |
| B-143 | Observability by client (capacitor / flutter / web) and alert thresholds | open | Phase 11.4 | 11 |
| B-144 | Staged rollout and rollback plan (`ROLLOUT.md`), including the contract-freeze window | open | Phase 11.5 | 11 |

## Phase 12 (not started)

Release gate. Device checks already listed above (B-004, B-005, B-007, B-043, B-071, B-081, B-082) close here if they are still open.

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-150 | Parity report: every T1/T2 row done or skipped with owner sign-off | open | Phase 12.1 | 12 |
| B-151 | Full manual QA on the device matrix, failures filed in the bug tracker | open | Phase 12.2 | 12 |
| B-152 | Performance budget recorded in `flutter_app/docs/PERF.md` | open | Phase 12.3 | 12 |
| B-153 | Store listing, privacy labels, and release CI (TestFlight and Play internal) | open | Phase 12.6–12.7. Owner holds the store accounts | 12 |
| B-154 | Capacitor sunset candidates list. Do not delete the wrapper without owner approval | open | Phase 12.9. The web app stays | 12 |

## Known limitations to remember

- Name sorting folds Latin letters only; non-Latin trip names sort by code unit (ICU differs). See `trip_utilities.dart` comment.
- `formatMoneyNumber` handles es/pl/pt-PT 4-digit grouping by hand; other ICU locale quirks may exist (`currency.dart` comment).
- Join/share generate/revoke are online-only writes (clear error offline).
- Guest/demo accounts never sync and cannot join trips.
- `GOOGLE_*` and `SUPABASE_*` ids come from git-ignored `env/*.json`; builds without a real backend run local-only.
- Web `API_CONTRACT.md` was corrected for expenses/messages columns in Phase 5; other tables were not re-audited against `tripApi.ts`.
