# Phase 10 (FE): Settings, notifications & push, flags, legal, feedback

**Track:** Flutter UI · **Size:** L · **Depends on:** Phase 6 (parts need 7/8 for deep links) · **Parallel with:** 9, 11
**Read first:** [README.md](README.md), `contract/PUSH_SETUP.md`, `contract/DEEPLINKS.md`, `PARITY_MATRIX.md` (this phase's rows).

## Goal
Everything around the product that users and the business depend on: settings, in-app and push notifications, the min-version gate, feature-flag-driven UI, legal pages, profile, feedback/bug reporting, data tools.

## Web sources to port
`SettingsTab`, `SettingsView` (~880 lines), `GlobalSettingsModal`, `settings/*` (Notifications, RecycleBin→Phase 7, StorageData, TripToolsHub), `common/SettingsSwitch`, `NotificationsPanel`, `NotificationsBellButton`, `InAppNotificationBanner`, `UpdateBanner`, `BugReportModal`, `FeatureRequestModal`, `PrivacyPolicyPage/Content`, `TermsOfServicePage/Content`, `LegalPageLayout`, `DeleteAccountPage` (in-app already Phase 6), `PullToRefreshIndicator`; services `notificationsApi`, `pushApi`, `pushRegistration`, `quietHoursApi`, `notificationDigestApi`, `featureFlagApi`, `bugApi`, `featureApi`, `growthApi`; utils `notificationText`, `notificationGroups`, `passReminders`, `autoBugReporter`, `diagnosticLogger`, `growthTelemetry`, `webNotifications`, `changelog`, `appVersion`, `landingCopy`.

## Tasks

### 10.1 Push notifications (end-to-end)
- Firebase init per flavor (same Firebase project, D2); `firebase_messaging`: permission prompt (contextual, after the first meaningful action; never at launch), APNs token ↔ FCM token handling on iOS, token registration into `device_push_tokens` with `client='flutter'`, `app_version`, refresh on rotation, **unregister on sign-out**, re-register on login (Phase 3 schema).
- Foreground presentation (iOS `setForegroundNotificationPresentationOptions` badge/sound/alert to match the Capacitor config), background/terminated handlers, **tap → deep link** using the `data` keys defined in Phase 3 (`tripId`, `route`, `type`) via go_router; cold-start-from-notification path tested.
- Android channels (match type groups from `notificationGroups`), Android 13 runtime permission, iOS badge count sync with unread counts.
- Local notifications (`flutter_local_notifications` + `timezone`): pass reminders (`passReminders`), settlement/closeout reminders if web has them; reschedule on boot/app update; respect quiet hours.
- In-app notifications panel: list from `notifications` table (realtime), grouping (`notificationGroups`), read/unread, mark-all-read, per-type text (`notificationText` parity via fixtures), tap → route, `InAppNotificationBanner` while foregrounded.
- Preferences: quiet hours (`quiet_hours_prefs`), digest prefs (`notification_digest_prefs`), per-trip mute, event-card mute: all server-backed where the web is.

### 10.2 Settings
Port the full settings tree: profile (name/avatar upload to storage), appearance (theme light/dark/system, density), haptics/sounds prefs, currency defaults, language (en only; l10n ready), notifications (above), storage & data (cache size, clear cache, **backup export/import JSON** parity with `backupValidation`; this doubles as the **legacy guest/demo data import path** for Phase 11), recycle bin link (Phase 7), trip tools hub (per-trip settings: roles, simplify-debts, approval threshold, FX config, category order, close/freeze/archive: calling Phase 7/8 providers), security (biometric lock toggle + timeout), connected accounts, about (version/build, changelog from `changelog.ts` content), diagnostics (sync inspector from Phase 5, log export), sign-out, delete account.
Settings switches/rows use the Phase 2 base components; every row is flag-aware.

### 10.3 Feature flags in the UI
Flags provider (Phase 5) drives: nav items, tab visibility, feature entry points, settings rows. Add a **debug-only flag override screen** (dev/staging flavors) to toggle locally for QA. Remote kill-switch check on app resume (re-fetch flags if older than N minutes).

### 10.4 Version gate & maintenance
Consume the Phase 3 min-version config: hard block (full-screen update required with store link), soft nudge (banner replacing `UpdateBanner`), maintenance message. Fail-open on network error (never lock users out because the config call failed).

### 10.5 Feedback & bug reporting
`BugReportModal` (report_bug RPC, screenshots via `RenderRepaintBoundary`/`screenshot`, device/app info, recent logs from the Phase 2 logger, "my reports" list via `list_my_bug_reports`), `FeatureRequestModal` (`submit_feature_request`), automatic error reporting parity with `autoBugReporter` (rate limiting + de-dupe; PII scrubbing reviewed), crash reporting from Phase 2 hooked to the same user id (hashed).

### 10.6 Legal & compliance screens
Privacy Policy, Terms: render the same content as web (`PrivacyPolicyContent`, `TermsOfServiceContent`: port text into l10n or fetch from the canonical URL with an offline fallback). Links in login/settings. In-app account deletion (Phase 6) reachable from settings. Data-collection disclosures list for store labels → `flutter_app/docs/PRIVACY_LABELS.md` (consumed by Phase 12).

### 10.7 Telemetry
`growthTelemetry` events parity (names, payloads, consent/flag gating), attribution (`signupAttribution`), `client`/`platform`/`app_version` fields from Phase 3. Buffered offline, flushed on connect, never blocking UI.

### 10.8 Tests & verification
- Push: manual device matrix (iOS/Android × foreground/background/terminated × logged-in/out) using staging + `send-push`; documented in `docs/FEATURE_TEST_STEPS.md`.
- Widget/unit: notification text/grouping fixtures, quiet-hours logic, settings flag matrix, version-gate decision table (below-min, below-recommended, fail-open).
- Integration: settings changes persist server-side and survive reinstall + login; backup export → import on a fresh install reproduces trips.
- Update parity matrix.

## Deliverables
Settings, notifications, push, version gate, feedback, legal screens; `PRIVACY_LABELS.md`; tests; docs/matrix; ADRs (notification routing, local-notification scheduling); `HANDOFF.md` entry.

## Out of scope
Ops Deck/admin, Superadmin auth, any new server table (use Phase 3/4 outputs).

## Exit criteria
- [ ] Push delivered and routed correctly on real iOS and Android in all six states of the matrix; sign-out stops pushes to that device.
- [ ] Min-version gate works (forced via config on staging) and fails open when offline.
- [ ] All T1 settings/notifications/legal rows `done`/`skipped+reason`.
- [ ] Backup export/import round trip proven; guest/demo import path documented for Phase 11.
- [ ] No PII in logs/bug reports (reviewed with a sample payload dump).
