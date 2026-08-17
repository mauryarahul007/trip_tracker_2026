# Backlog

Mirrors the team's Google Sheet (no write access from here — see session
notes). Paste new lines into the sheet when convenient, or treat this file
as the working backlog directly.

## Done

- Fix navigation gestures/hardware back button not working (Android + web)
- Fix scroll-lock (`touch-action: none`) blocking the swipe-back gesture
- Fix back-navigation history entries getting collapsed by mobile Chrome
  (same-URL pushState) — switched to real hash-fragment URLs per screen/modal
- Fix settings page "perforation" divider rendering as mismatched dots
- Offline-first architecture, Phases 1-3 (WhatsApp-style: full app usable
  with zero connectivity, sync queue reconciles when back online)
  - Phase 1: `addMember`/`createGroup`/`updateGroup`/`deleteGroup`/
    `addCategory`/`deleteCategory` now queue offline (same pattern already
    used for expenses); removed the hard offline block on `addMember`
  - Phase 2: `QuotaExceededError` now surfaces as `storageError` instead of
    silently dropping writes; added a `migrate()` stub for future schema
    changes
  - Phase 3: offline-captured receipt photos now stage in a dedicated
    IndexedDB store (`src/services/offlineReceiptStore.ts`) instead of the
    localStorage JSON blob
  - Follow-up: `createTrip` and `deleteMember`/`updateMember`/
    `toggleArchiveMember` also had no offline path (same silent-no-op bug
    class) — closed
  - Fixed a root-cause bug found during offline retest: toggling
    offline/online briefly nulled the Supabase session (a transient
    token-refresh hiccup, not a real sign-out), which unmounted the whole
    authenticated app behind the login redirect — looked like every
    member/group/expense vanishing at once. Now only clears session on an
    explicit `SIGNED_OUT` event (`src/store/authStore.ts`)
- App version shown in Settings → About (`src/utils/appVersion.ts`) — real
  native version/build on Android/iOS via `@capacitor/app`, git commit SHA
  on web (auto-updates every deploy, no manual version bump needed)
- Multi-Agent & In-App Unified Bug Tracking System (`scripts/bug.mjs`, `bugs/bugs.json`,
  `BUGS.md`, `src/components/BugReportModal.tsx`, `docs/howto-bug-tracking.md`)
- Full session writeup: `docs/explanation-navigation-and-offline-fixes.md`

## Deferred

- Full store migration off localStorage onto IndexedDB (only worth it if
  trip/expense data volume itself approaches the quota — no evidence yet;
  Phase 3 above already moves the one real risk, receipt photos, out)
- Conflict resolution for the same expense edited on two offline devices
  (current behavior: local dirty edit always wins over server — a
  reasonable default for this domain, not a bug, just not true WhatsApp
  parity)

## From the sheet (untriaged)

- implement superadmin console
