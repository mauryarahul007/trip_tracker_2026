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
| B-022 | P5 | Repositories not built yet: profile, locations, growth telemetry, bugs/feedback, notifications (read side, **done in P10 slice A**), push tokens | deferred | Messages (text) and passes (collab JSON) shipped in Phase 8. Receipts and settlements shipped in Phase 7. | Add the rest with their phases | 9-10 |
| B-023 | P5 | Realtime: typing/presence channels (`trip_chat_typing`, `trip_presence`) | deferred | Text chat shipped without typing or presence (ADR 267) | Add when those labs flags are turned on | later |
| B-024 | P5 | ~~Sync conflict resolver UI (data is exposed as a stream)~~ | **closed (P7 slice E)** | Ledger sheet: keep mine dismisses; keep theirs calls `adoptServerCopy` (B-060) | n/a | 7 |
| B-025 | P5 | ~~Tombstones hard-delete expenses, so the 24 h recycle bin is not mirrored to other devices~~ | **closed (P7 slice A)** | Pull sync now also reads soft-deleted rows (`recycledExpenses`) and keeps them restorable; covered by a pull test | n/a | 7 |
| B-026 | P5 | Outbox payload compaction (add then edit of the same pending expense stays as two items) | deferred | Works, just chattier | Coalesce per entity in `OutboxStore.enqueue` | 11 |
| B-027 | P5 | Domain-layer purity lint is a test, not an analyzer rule | deferred | Test enforces it | Optional custom lint | 12 |
| B-030 | P6 | Trips home is a list; the web's 3D stacked-card trip stack is not built | deferred | Large visual port; Hero title transition used instead | Build stacked cards with slivers; measure 55 fps | 6 / 12 |
| B-031 | P6 | Trip cards lack cover photo, `BoardingPassHeroCard`, `NextUpTravelCapsule`, destination photo service/cache | deferred | Needs image services (`placeImageService`) | Port with caching | 6 / 9 |
| B-032 | P6 | Destination autocomplete / place gazetteer (`placeSuggest`) in create-trip; previous-members suggestions; clone-squad | deferred | `placeGazetteer` not ported | Port module + fixtures | 6 |
| B-033 | P6 | Trip list actions are owner-only; trip admins cannot archive/delete | deferred | Trip settings (P10) is owner-only too, matching the trips list. RLS lets admins write, so the UI is stricter than the server | Add an admin check from members and use it in both places | 10 |
| B-034 | P6 | ~~Trip settings screen is a stub~~ | **closed (P10 slice B)** | `TripSettingsScreen`: mute, simplify debts, approval threshold, categories, recycle bin, freeze, close, archive. FX config and category reorder are not in it (B-171) | n/a | 10 |
| B-035 | P6 | ~~Notification bell in the trip header~~ | **closed (P10 slice A)** | `NotificationBell` with unread badge in the trip header, opens `/notifications?trip=<id>` | n/a | 10 |
| B-036 | P6 | ~~App-lock toggle has no UI~~ | **closed (P10 slice B)** | Settings, Security (behind `enableBiometricAuth`). Real-device prompt unverified (B-012) | n/a | 10 |
| B-037 | P6 | QR scanner for joining a trip | deferred | Needs `mobile_scanner` + camera permission. Not in the Phase 8 build. | Add scanner, route result to `/join/:code` | 9 |
| B-038 | P6 | Contacts picker in the invite sheet (`flutter_contacts` removed for now) | deferred | Phase 8 invite reuses the share sheet. Contacts stay out. | Add package + iOS/Android permission strings + rationale | later |
| B-039 | P6 | `/live/:token` read-only live-location page is a shell | **closed (P9 Sub-phase 9B)** | LiveScreen viewer with MapGateway, live pulse indicator, relative time, and expired states (ADR 269) | n/a | 9 |
| B-040 | P6 | Invite-conversion growth behaviour (`enableInviteConversion` default attribution on join, `get_public_growth_flags`) | deferred | Growth flag plumbing not ported | Port `fetchPublicGrowthFlags` + attribution default | 10 |
| B-041 | P6 | ~~`member_joined` push to existing members after a join~~ | **closed (P10 slice E)** | `PushSender.notifyOthers` after a successful claim. Unverified against a real project | n/a | 10 |
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
| B-055 | ~~Push for expense added / settlement confirmation requested~~ | **closed (P10 slice E)** | The request rides the outbox payload (`push`) and is sent after the server write. Unverified against a real project | 10 |
| B-056 | Divergence: saving a split with no active members returns an error ("Select at least one active traveler to split with."); the web silently does nothing | accepted | Intentional UX fix; revisit if strict parity is required | 7 |
| B-057 | Cross-trip expense search (`enableCrossTripSearch`) and the web's collapsible stats "chrome" are not ported; Flutter always shows the summary card | done | Search (flag OFF) lists matches from other local trips. Compact summary is flag-gated | 7 |
| B-058 | `enableCompactSummary`, `enableCategoryColorRings`, `enableMotionPolish` presentation flags are not honoured by the new rows | done | Compact summary, color rings, and compact ledger are gated. Motion polish stays a later visual pass | 12 |
| B-059 | Dispute / approve / confirm-settlement are online-only (parity with the web): they fail with "You're offline" instead of queueing | accepted | Queue them via the outbox if offline use becomes a requirement (the RPCs are replay-safe, 0115) | 7 |
| B-060 | Conflict badge only appears after a pull reports a conflict; the resolver UI (B-024) is not built | done | Ledger sheet: keep mine dismisses; keep theirs calls `adoptServerCopy` | 7 |
| B-061 | Test harness note: Drift streams created under `FakeAsync` can stall a following transaction. Widget tests must use `real()`/`settle()` from `test/support/pump_app.dart`; two writes in one `real()` block can hang | known | Document for new tests (done in HANDOFF) | n/a |
| B-062 | Divergence: Shares (weights) split now persists its weights (`splitConfig`); the web dropped them, which made edits reset to equal | accepted | Web bug; fix web to match if desired | 7 |
| B-063 | Expense form uses built-in/custom exchange rates only; the web's live `fetchExchangeRates` is not called | done | Frankfurter USD rates, 24h cache, offline fallback to `defaultExchangeRates`; custom trip rates still win | 7 |
| B-064 | Expense form: receipt OCR and voice input are not built | done | Phase 9C shipped in ADR 270: `receipt_ocr_service`, `OcrGateway`, `ReceiptOcrModal`, `speech_recognition_gateway`, mic input in `QuickAddSheet` | 9 |
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
| B-100 | Maps and journey: trip map, route stops, geotagged expense pins, destination photos, offline tiles, map collapsed by default | closed | Phase 9A shipped in ADR 268 (`route_helper`, `place_suggest`, `place_image_service`, `road_route_service`, `MapGateway`, `DeferredTripMapHero`, `TripJourneyMap`, `TripRouteModal`). | 9 |
| B-101 | Boarding-pass gate scanner (`enableGateScanner`) | closed | Phase 9D shipped in ADR 271: `pass_scanner_modal.dart`, `PassScannerModal` with high-contrast QR display, booking code copy, seat/berth details. | 9 |
| B-102 | Flight radar status (`enableFlightRadar`) | closed | Phase 9B shipped in ADR 269: `travel_status_service.dart`, `LiveTravelStatusModal` on travel passes in NotesTab, flight and train trackers. | 9 |
| B-103 | Add-to-calendar / ICS export (`enableIcsExport`) | closed | Phase 9D shipped in ADR 271: `ics_export_service.dart`, `shareTripIcs`, Pure Dart RFC 5545 generator wired into `TripToolsSheet` and `NotesTab`. | 9 |
| B-104 | Live location share, heartbeat, member map, and a finished `/live/:token` page (`enableLiveLocationShare`) | closed | Phase 9B shipped in ADR 269: `LocationGateway`, `GeolocatorLocationGateway`, `LocationShareRepository`, `LiveLocationService` 60s heartbeat, `LiveScreen`, `LiveLocationShareModal`, `LiveLocationChatBanner`. | 9 |
| B-105 | Weather itinerary nudges (`enableWeatherItineraryNudges`) | closed | Phase 9C shipped in ADR 270: `weather_service.dart` with SWR caching, `WeatherBadge` in checklist/notes and trip shell. | 9 |
| B-106 | Offline trip snapshot (`enableOfflineSnapshot`) | closed | Phase 9C shipped in ADR 270: `offline_snapshot_service.dart`, `OfflineSnapshotModal`, integrated into `TripToolsSheet`. | 9 |
| B-107 | Trip Wrapped slides and share image (`enableTripWrapped`) | closed | Phase 9D shipped in ADR 271: `trip_wrapped_service.dart`, `TripWrappedModal` 5-slide interactive story viewer, theme toggle, and rasterized PNG card sharing. | 9 |
| B-108 | Achievements and badges (`enableAchievements`) | closed | Phase 9D shipped in ADR 271: `achievements_service.dart`, `AchievementBadgeModal` enamel pin squad milestone badges wired in `TripToolsSheet`. | 9 |
| B-109 | Traveler passport (`enableTravelerPassport`) | closed | Phase 9D shipped in ADR 271: `traveler_passport_service.dart`, `TravelerPassportModal`, vector customs ink stamps (`PassportStamp`) wired in `TripToolsSheet`. | 9 |
| B-110 | Next Up capsule and progressive Next Up (`enableNextUpCapsule`, `enableProgressiveNextUp`) | closed | Phase 9D shipped in ADR 271: `next_up_capsule.dart`, `NextUpTravelCapsule` with countdown, route, seat, and gate scanner shortcut. | 9 |
| B-111 | Keyword tagging (`enableKeywordTagging`) | open | Labs. Category keywords from the web util | 9 |
| B-112 | Auto currency detection (`enableAutoCurrencyDetection`) | open | Pro. Country map exists in domain logic; the form does not use it | 9 |
| B-113 | Expense photo linking (`enableExpensePhotoLinking`) | open | Pro. Receipt upload exists; linking a photo as the web does is not built | 9 |
| B-114 | Command palette | deferred | Phase 9D says omit on mobile unless the parity matrix requires it. No matrix row today | 9 |
| B-115 | Trip media gallery extras | open | Phase 9D. Image attach in chat is B-085 | 9 |

## Phase 10 (built, headless-verified; device verification open)

Settings, notifications, push, flags in the UI, feedback, and profile. Pieces already owed: settings stub (B-034), notification bell (B-035), app-lock toggle (B-036), expense/join push (B-055, B-041), profile and push-token repositories (B-022).

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-120 | Push end to end: FCM/APNs, token register and unregister, tap-through deep link, foreground banner | **built, unverified** | Code and tests done (P10 slice E). Needs Firebase files, Gradle plugin, iOS capability and the six-state device matrix (B-136, B-137) | 10 |
| B-121 | ~~In-app notification list, grouping (`enableNotificationGrouping`), mark read~~ | **closed (P10 slice A)** | `NotificationRepository` (Drift read model + best-effort server writes), list with burst folding, Money chip, mark read/unread, swipe delete, clear, foreground banner. Push is B-120. Unverified against a real project (needs staging) | 10 |
| B-122 | ~~Quiet hours, digest, and per-trip mute~~ | **closed (P10 slice C)** | Server-backed like the web. Real server behaviour unverified (needs staging) | 10 |
| B-123 | ~~Local pass reminders~~ | **closed (P10 slice E)** | Settlement/closeout reminders are not ported: the web has none locally (the server sends `settlement_reminder`). Unverified on device | 10 |
| B-124 | ~~Full settings tree~~ | **closed (P10 slice B)** | Profile name, appearance, haptics, default currency, notifications, security, backup export/restore, help, about, account. Avatar upload is B-138 | 10 |
| B-125 | ~~AMOLED theme (`enableAmoledTheme`)~~ | **closed (P10 slice B)** | Settings switch (flag on) swaps the dark theme for the existing AMOLED tokens | 10 |
| B-126 | Data saver mode (`enableDataSaverMode`) | open | Pro. Settings row | 10 |
| B-127 | ~~Min-version gate and maintenance~~ | **closed (P10 slice C)** | Hard block, soft banner, maintenance screen, fail open, re-check on resume. Forced on staging unverified | 10 |
| B-128 | ~~Bug report and feature request~~ | **closed (P10 slice D)** | Text, logs (scrubbed), "my reports", auto-report with dedupe and rate limit. Screenshot attach is B-139 | 10 |
| B-129 | ~~What's New hub (`enableWhatsNewHub`)~~ | **closed (P10 slice B)** | Changelog sheet from a generated Dart const (newest 12 entries) | 10 |
| B-130 | ~~Growth telemetry (`enableGrowthTelemetry`)~~ | **closed (P10 slice D)** | `app_open`, `sync_fail`, `queue_stuck`, `flush_ok`. Lifecycle nudges are server-only (nothing to port). Invite conversion is B-040 | 10 |
| B-131 | ~~Sync queue inspector~~ | **closed (P6)** | Already built behind the flag (`SyncChip` sheet). Diagnostics adds a summary line | 10 |
| B-132 | Demo data seeding (`enableDemoSeeding`) | open | Labs. Ops-style seed, not a traveler default | 10 |
| B-133 | Trip stack alphabetical sort (`enableTripStackSort`) | open | Pro. The 3D stack itself is B-030 | 10 |
| B-134 | Extended undo (`enableExtendedUndo`) | open | Core flag default on; the longer undo window is not ported | 10 |
| B-135 | Motion polish (`enableMotionPolish`) | deferred | B-058 shipped the other presentation flags. This visual pass was left | 12 |

### Added by Phase 10

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-136 | Firebase config and Gradle plugin | open (see B-182: the Capacitor files already exist) | `google-services.json` / `GoogleService-Info.plist` are not in the repo; the `com.google.gms.google-services` plugin was deliberately not added (build fails without the file). See `contract/PUSH_SETUP.md` section 5 | 11, 12 |
| B-137 | iOS Push Notifications capability | open | Needs Xcode (creates `Runner.entitlements`, `aps-environment`) and the APNs key in Firebase. `UIBackgroundModes: remote-notification` is already set | 12 |
| B-138 | Profile photo upload | open | Needs storage bucket policy decision; name edit is done | 10 follow-up |
| B-139 | Bug report screenshot attach | open | `RenderRepaintBoundary` capture and a size cap; text and logs are done | 10 follow-up |
| B-170 | Device matrix for push (iOS and Android x foreground, background, terminated x signed in and out) and sign-out stops pushes | open | Needs devices and staging. Steps in `FEATURE_TEST_STEPS.md` FLUTTER-P10E | 12 |
| B-171 | Trip settings: FX config, category reorder, member roles screen | open | `TripToolsSheet` and the Members tab cover roles; FX and reorder have no Flutter UI yet | 10 follow-up |
| B-172 | Legal text is a summary plus "read the full document online" | deferred | The web policy text contains web-specific statements (Tesseract, IndexedDB, WebAuthn) that are wrong for the app. Needs a counsel-approved native version, then port | 12 |
| B-173 | `connectivity_plus` pinned to 7.3.1 (was 7.3.2) | deferred | Stable `flutter_local_notifications` 22.x needs `dbus` 0.7, 7.3.2 needs 0.8. Lift when a stable fln supports it | 12 |
| B-174 | Data saver mode (`enableDataSaverMode`), demo seeding, trip stack sort, extended undo, motion polish | open | Pro/Labs rows from the original Phase 10 list, not built | 10 follow-up |
| B-145 | `app_events` columns in `API_CONTRACT.md` section 2.17 are wrong | open | Doc says `platform`, `app_version`, `payload`; migration 0108 has `user_id`, `event`, `props`, `day`. The client follows the migration | 11 |
| B-146 | Restoring a backup creates new trips (new ids) | deferred | Repositories own id creation; a second restore of the same file duplicates (the dialog says so). Add id-preserving import if wanted | 11 |
| B-147 | Disabling app lock needs no biometric | deferred | `BiometricLockEnabled.setEnabled(false)` skips the prompt (Phase 6 design); a thief with an unlocked phone could turn it off | 12 |
| B-160 | Staging verification of the Phase 10 server paths: quiet hours, digest and mute rows, `get_app_version_gate` forced below min, `send-push` for expense, settlement and join, `app_events` inserts, `report_bug` and `submit_feature_request` | open | Needs a staging Supabase project (B-001). Only fakes exercised so far | 11, 12 |
| B-161 | PII review of real payloads | open | Exit criterion: dump a sample bug report, auto report and log share from a real session and confirm no emails, phone numbers or tokens. The scrubber is unit-tested only | 12 |
| B-162 | Confirm iOS foreground push on a device | open | Chosen: badge and sound only, the in-app banner is the alert (Capacitor had alert on). Check there is no double banner or missed alert; flip `setForegroundNotificationPresentationOptions` if wrong | 12 |
| B-163 | Android reminder timing and boot persistence | open | Inexact alarms can drift a few minutes under Doze. Verify on a device, reboot included; switch to exact alarms only if it matters | 12 |

## Phase 11 (documents written; nothing live, nothing applied)

Cutover ops: specs, contracts, queries and plans. No migration was added, no web code changed.

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-140 | ~~Legacy-data inventory~~ | **documented (P11)** | `contract/LEGACY_DATA.md`. Owner decisions L1-L4 (B-179) and exposure sizing (needs telemetry, B-180) are open | 11 |
| B-141 | Final Capacitor release spec | **documented (P11), build not started** | `contract/FINAL_CAPACITOR_RELEASE.md`. Needs owner approval, then web work under the normal rules (flags, steps, version bump). Ships over the air | 11 |
| B-142 | ~~Backup import contract~~ | **documented (P11)** | `contract/BACKUP_IMPORT.md`. Fixed a real gap: the web export has `members` as a map, now supported. Idempotent re-import still needs the `import_batch_id` draft (B-146) | 11 |
| B-143 | Observability by client and alert thresholds | **documented (P11), not live** | `ops/observability.sql`, `ops/ALERTS.md`. Queries are run by hand; thresholds await owner confirmation (B-179). Gaps listed in ALERTS.md section 4 | 11 |
| B-144 | Staged rollout and rollback plan | **documented (P11)** | `ROLLOUT.md`, `CUTOVER_RUNBOOK.md`. Stages, soak times, sunset date and restore drill need owner decisions (B-179) | 11 |

| B-175 | Flutter-only surfaces without a server kill switch: backup export/restore, push prompt and registration, auto bug reporter, Diagnostics | open | Cutover plan relies on flags (`ROLLOUT.md` section 4). Add Ops Deck flags in `src/types/admin.ts` and `src/utils/featureFlags.ts` (web change, normal rules), then read them in Flutter | 11 follow-up |
| B-176 | Confirm production backups (PITR or daily), retention, and run a restore drill | open | Dashboard check; cannot be done from the repo. Record in `ROLLOUT.md` section 5 | 11, 12 |
| B-177 | Per-user rate limit for `report_bug` and `submit_feature_request` | open | Additive RPC change; today any signed-in user can flood the ledger | 11 follow-up |
| B-178 | Backup export should say it contains trip and member names | open | One line in the Settings export confirmation | 12 |
| B-179 | Owner decisions: L1-L4 (`LEGACY_DATA.md`), A1 thresholds and A2 draft migrations (`ops/ALERTS.md`), R1-R4 stages, sunset date, who flips switches, restore-drill date (`ROLLOUT.md`) | open | Nothing downstream can be scheduled until these are answered | 11, 12 |
| B-180 | Size the guest and vault exposure | open | Needs the two count-bucket telemetry events (draft migration 0116) shipped in the final Capacitor release | 11, 12 |
| B-181 | Security review findings: restrict Firebase API keys, confirm `send-push` authorises the caller against the trip, confirm the anonymous join-preview IP header, run the RLS suite on staging | open | `ops/SECURITY_REVIEW.md` section 6 | 11, 12 |
| B-182 | Reuse the committed Capacitor Firebase files for Flutter | open | `android/app/google-services.json` and `ios/App/App/GoogleService-Info.plist` already exist for `com.triptracker.app`. Copying them into `flutter_app` closes most of B-136 (owner decision: the contract says Flutter's copies are git-ignored) | 11, 12 |
| B-183 | Draft migrations 0116 (more `app_events` kinds) and 0117 (`trips.import_batch_id`) | open | Drafts in `ops/ALERTS.md` section 5; nothing applied. Needs approval, a free migration number, a Flutter client change for the marker, and web CI green | 11 follow-up |

## Phase 12 (prepared: automation, config, docs; device and store work open)

Release gate. Device checks already listed above (B-004, B-005, B-007, B-043, B-071, B-081, B-082) close here if they are still open.

| ID | Item | Status | Why / how to close | Owner phase |
|----|------|--------|--------------------|-------------|
| B-150 | Parity report: every T1/T2 row done or skipped with owner sign-off | **documented (P12)** | `PARITY_REPORT.md` shows 24 T1 and 2 T2 rows not done; needs owner sign-off or work (B-195) | 12 |
| B-151 | Full manual QA on the device matrix, failures filed in the bug tracker | open | `QA_LOG.md` is the template; every cell is empty. Includes the screen-reader pass and `IOS_DEFECTS.md` evidence | 12 |
| B-152 | Performance budget recorded in `flutter_app/docs/PERF.md` | **documented (P12)** | budgets and procedure in `flutter_app/docs/PERF.md`; nothing measured | 12 |
| B-153 | Store listing, privacy labels, and release CI (TestFlight and Play internal) | **prepared (P12)** | `store/*`, `codemagic.yaml` release workflows, `tool/*`; nothing run | 12 |
| B-154 | Capacitor sunset candidates list. Do not delete the wrapper without owner approval | **documented (P12)** | `SUNSET_CANDIDATES.md`; nothing deleted | 12 |
| B-190 | Decide whether live location needs background access at all | open | Dropping `ACCESS_BACKGROUND_LOCATION` and `UIBackgroundModes: location` avoids the Play declaration video and extra Apple review; trade-off is updates stopping when the screen locks. See `store/REVIEW_NOTES.md` | 12 |
| B-191 | No crash tool: release stack traces are obfuscated text in the bug ledger | open | Keep `build/symbols` from every release (pipeline saves them). Decide on a crash service or a symbolication step | 12 |
| B-192 | Heavy parsing (backup restore, CSV, Splitwise import) runs on the UI isolate | open | Measure first (`PERF.md`); move to `Isolate.run` with a test seam if a long frame shows | 12 |
| B-193 | R8 shrinking and the new release signing config were never built or smoke-tested | open | No Android SDK here. First `flutter build appbundle --release` must be installed and exercised (push, notifications, sign-in), not only built | 12 |
| B-194 | Reduce-motion audit | open | Check `MediaQuery.disableAnimations` handling across the motion suite | 12 |
| B-195 | T1 rows not built: destination suggest, covers, traveler pass back, clone squad, extended undo, calm haptics, expense photo link | open | `PARITY_REPORT.md`. Owner decision: build before first release or sign off the skip | 12 |
| B-196 | Last Capacitor store build numbers | open | `tool/release_version.sh` assumes 746 (last in the repo). Check App Store Connect and Play Console and set `TT_MIN_BUILD_NUMBER` if higher | 12 |
| B-197 | Release pipelines (`flutter-android-release`, `flutter-ios-release`) have never run | open | Needs Codemagic secrets, Firebase files, store accounts. See `store/RELEASE_PIPELINE.md` | 12 |
| B-198 | Rollback drill on staging (config flips and a halted rollout) | open | Phase 12 exit criterion. Needs staging (B-001) | 12 |
| B-199 | Store assets: screenshots from seeded staging, support URL and mailbox, age rating answers, reviewer demo account | open | `store/LISTING.md` has the drafts and checklists | 12 |

## Known limitations to remember

- Name sorting folds Latin letters only; non-Latin trip names sort by code unit (ICU differs). See `trip_utilities.dart` comment.
- `formatMoneyNumber` handles es/pl/pt-PT 4-digit grouping by hand; other ICU locale quirks may exist (`currency.dart` comment).
- Join/share generate/revoke are online-only writes (clear error offline).
- Guest/demo accounts never sync and cannot join trips.
- `GOOGLE_*` and `SUPABASE_*` ids come from git-ignored `env/*.json`; builds without a real backend run local-only.
- Web `API_CONTRACT.md` was corrected for expenses/messages columns in Phase 5; other tables were not re-audited against `tripApi.ts`.
