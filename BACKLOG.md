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

## Deferred

- Full store migration off localStorage onto IndexedDB (only worth it if
  trip/expense data volume itself approaches the quota — no evidence yet;
  Phase 3 above already moves the one real risk, receipt photos, out)
- Conflict resolution for the same expense edited on two offline devices
  (current behavior: local dirty edit always wins over server — a
  reasonable default for this domain, not a bug, just not true WhatsApp
  parity)

## From the sheet (untriaged)

- Need to implement bug tracker
- Implement the app version under settings
- implement superadmin console
