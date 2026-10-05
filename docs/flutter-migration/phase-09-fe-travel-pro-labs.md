# Phase 9 (FE): Travel, Pro & Labs features

**Track:** Flutter UI · **Size:** XL · **Depends on:** Phases 7, 8 · **Parallel with:** 10, 11
**Read first:** [README.md](README.md), `PARITY_MATRIX.md` (T2/T3/T4 rows).

## Goal
Everything beyond the money-and-people core: maps, live location, OCR receipts, weather, wrapped, offline travel mode and the remaining Pro/Labs features, **in tier order, each behind its existing flag**.

Work in this order; each sub-phase is independently shippable. Skip any T4 (`labs`) item whose flag is OFF in production (check with the owner / `get_resolved_feature_flags` on prod).

## Web sources to port (by sub-phase)

### 9A (T2) Maps & journey
`TripMapHero`, `DeferredTripMapHero`, `TripJourneyMap`, `TripRouteModal`, `useResolvedTripStops`, `routeHelper`, `geolocation`, `placeImageService`, `mapTileCacheFlag`, `tripPhotoPlaces`, `tripDestination`.
- Native MapLibre (`maplibre`): same style/tile source as web (`src/utils`/service for the style URL), markers for stops + geotagged expenses (`TripJourneyMap` parity: category colours, currency symbol), route line, camera fit, offline tile cache if the `mapTileCacheFlag` is on (use MapLibre offline regions; document size limits), hero map with lazy init (maps are heavy: build only when visible; dispose properly).
- Destination/stop editing (`updateTripRow` with stops), place search (`placeSuggest`).
- Perf: the map must not drop trip-stack/tab animation below 55 fps; use `PlatformView` hybrid composition notes per platform and ADR the choice.

### 9B (T2) Live location & travel status
`LiveLocationPage`, `LiveLocationShareModal`, `LiveLocationChatBanner` (chat side from Phase 8), `LiveTravelStatusModal`, `locationShareApi`, `liveLocationHeartbeat`, `travelStatusService`.
- Share/stop sharing, heartbeat while sharing using `geolocator` + **proper background location** (iOS "Always"/background modes + `NSLocation*` strings; Android foreground service type `location` + notification) with a clear permission education flow; battery-aware interval; `member_locations` writes; viewers' map of members; public `/live/:token` page (`get_shared_location`) rendered natively.
- Privacy/safety UX: visible "you are sharing" indicator, expiry, one-tap stop, revoked token behaviour. Needs App Store privacy-label notes → hand to Phase 12.

### 9C (T2) Receipts OCR, voice, offline snapshot, weather
`ReceiptScannerModal`, `receiptOcr`, `offlineReceiptStore`, `SmartExpenseQuickAddModal` voice part, `speechRecognition`, `OfflineSnapshotModal`, `OfflineTravelBanner`, `weatherService`, nudges client side, `imageCompressor`, `imageLuminance`.
- **Receipt scanner:** camera/gallery → `google_mlkit_text_recognition` (on-device) → port the web parsing heuristics from `receiptOcr.ts` (amount/merchant/date/currency; add fixtures generated from TS for sample OCR text) → prefilled expense form; receipt stored via outbox upload. Document accuracy delta vs tesseract.js.
- **Voice quick add:** `speech_to_text` with locale choice and permission flows; mirrors web's transcript → `expenseQuickParser` path; handles recogniser errors/timeouts exactly like `speechRecognition.ts` tests describe.
- **Offline snapshot:** export/import a trip snapshot (parity with `OfflineSnapshotModal`); offline-mode banner with queued-change counts.
- **Weather:** port `weatherService` (provider + caching + cache TTL), per-day itinerary weather chips; permission-free.

### 9D (T3) Pro features
`TripWrappedModal` (+ `TripSlideLauncher`, `AchievementBadgeModal`, `travelerPassport`), `AnalyticsTab` (if deferred from Phase 7), `FxRatesModal` extras, `SmartPackingAssistantModal`, `CommandPalette` (decide: omit on mobile unless parity matrix says otherwise), `calendar`/`icsExport` ("add to calendar" via `add_2_calendar`/share `.ics`; note migration `0103` removed calendar sync: do **not** rebuild server sync), `ExpenseApproval` extras, `settlementShareCard` (if not done), `TripMediaGalleryModal` extras.
- **Trip Wrapped:** story-style slides (`PageView` + animations), shareable image/video: render with `RepaintBoundary` → PNG (video optional, ADR).
- Achievements/badges parity via fixtures from `achievementBadges.ts`.
- Packing assistant: port `packingSuggestions`; if it calls an LLM/remote service, document endpoint, auth and cost; **do not embed any API key in the app** (route through an edge function).

### 9E (T4) Labs
Port only flags that are ON in prod or that the owner explicitly requests; each one needs an entry in the parity matrix marked `labs-approved`.

## Cross-cutting requirements
- Every feature reads its flag via the Phase 5 flags provider; flag OFF = **no route, no entry point, no background work** (test with a flag-matrix widget test that toggles flags and asserts absence).
- Permission handling pattern (single `PermissionService`): pre-prompt rationale → system prompt → denied/permanently-denied recovery (open settings). Strings in l10n. Android 13+ notification perms and iOS `Info.plist` usage strings listed in a table in `flutter_app/docs/PERMISSIONS.md` (consumed by Phase 12 store review).
- Battery/privacy: no location or mic use outside an explicit user action.
- Each sub-phase updates `docs/FEATURE_TEST_STEPS.md` and the parity matrix.

## Tests & verification
- Fixture-based tests for `receiptOcr` parsing, wrapped stats, badges, weather mapping.
- Widget tests with fake map/location/camera/speech gateways (wrap each plugin behind an interface in `core/platform/` so tests don't need devices).
- Device checklist (real iOS + Android): map hero in trip stack, background live location 15 min, OCR on 5 sample receipts, voice quick add in en-IN and en-US, offline snapshot round trip, wrapped export.

## Deliverables
Features per sub-phase, interfaces for platform plugins, `PERMISSIONS.md`, tests, updated docs/matrix, ADRs (map view mode, OCR delta, background location), `HANDOFF.md` entry per sub-phase (9A…9E).

## Out of scope
Ops Deck, new features not on web, rebuilding calendar sync.

## Exit criteria
- [ ] All T2 rows `done` (required before Capacitor sunset); T3 rows `done` or deferred with owner sign-off; T4 only approved items.
- [ ] Flag-matrix test proves OFF flags remove UI and background work.
- [ ] Background live location verified on real devices (iOS + Android) incl. battery observation and revocation.
- [ ] OCR/voice results documented against the web baseline on the same samples.
- [ ] Permissions table complete; no permission requested without an in-context rationale.
