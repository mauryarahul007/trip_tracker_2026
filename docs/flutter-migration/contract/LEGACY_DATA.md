# Legacy device data: what the Capacitor app holds that the server does not

Phase 11.1. Inventory of data that lives **only inside the Capacitor WebView** and would be stranded when a user moves to the Flutter app. Source: the web code at 3.45.0 (files named per row). Counts are **not available**: guests have no server account, and queue/vault contents are on devices. Each row says what to do; the owner decisions needed are collected at the end.

## 0. Why this matters (and one thing that is not a problem)

- Capacitor and Flutter share the bundle id `com.triptracker.app` (decision D2), so Flutter installs as an **update**. The OS keeps the old app's data folder, but Flutter cannot use it: the WebView stores live in `Library/WebKit/...` (iOS) and `app_webview/` (Android) as LevelDB/IndexedDB files. Reading those natively is possible but fragile and is **not recommended** (see option C below). Treat device-local data as unreachable once the Flutter build is installed unless it was exported or synced first.
- Everything signed-in users did is in Supabase **if their sync queue drained**. Only the rows below are at risk.

## 1. Inventory

| # | Data | Where it lives (web source) | Server copy? | Unrecoverable after switch? | Handling |
|---|------|------------------------------|--------------|-----------------------------|----------|
| 1 | **Unsynced edits**: `syncQueue` items for trips, expenses, members, categories, settlements | zustand `persist` blob, localStorage key `trip-tracker-store-v1` (`src/store/tripStore.ts`, `syncQueue`) | Only once flushed | **Yes if never flushed** | Final Capacitor release flushes on launch and warns with the pending count (11.2). Users who never open it again keep a small residue: accept and publish a support note |
| 2 | **Guest-mode trips** (provider `guest`, id `guest-traveler-user-id`) | Same persisted blob; no Supabase account (`src/store/authStore.ts`) | **None** | **Yes** | Export backup JSON (11.2) then **Restore backup** in Flutter (already built: `BackupService`). Count unknowable from the server |
| 3 | **Demo-mode data** (`trip_tracker_demo_session`) | localStorage + same blob | None | Yes, but disposable | Do not migrate. Flutter has its own demo sign-in. Tell users nothing is lost that matters |
| 4 | **Offline receipt photos** waiting to upload | IndexedDB `trip-tracker-offline-receipts` (`offlineReceiptStore.ts`), keyed by expense id | Only after upload | Yes if not uploaded | Flushed by the final release's queue flush. Not exportable in JSON (base64 images); warn if any remain |
| 5 | **Offline chat outbox** | IndexedDB `trip-tracker-offline-chat` (`offlineChatStore.ts`) | Only after drain | Yes if not drained | Same flush. Small, text only. Include in the "pending" count |
| 6 | **Pass attachments** (ticket PDFs, boarding images) | IndexedDB `trip-tracker-pass-attachments` (`passAttachmentStore.ts`) | **None** (the pass JSON syncs, the file does not) | **Yes** | Flutter shipped manual passes **without** attachments (ADR 267, B-020, B-090). Needs an export-to-share step in the final release, and a Flutter attachment store |
| 7 | **Document vault** (passport, visa, insurance, ID scans) | IndexedDB `trip-tracker-document-vault` (`documentVaultStore.ts`); privacy policy says "strictly local, never uploaded" | **None, by design** | **Yes** | Flutter has no vault (flag off, B-020). Final release must offer "Export my documents" (zip or share sheet) and say plainly that they will not carry over. Never upload them server-side (contradicts the policy) |
| 8 | **Local preferences** | localStorage: `theme-pref`, `trip_tracker_sound_enabled`, `tt_haptic_preference`, `trip_tracker_voice_lang`, `tt-trip-stack-sort`, `tt-home-view-mode`, `tt-data-saver-suggested`, `expense-presets-tip-seen`, `tt-default-split:v1:<trip>`, `tt-summary-breakdown-open` | None | Yes | Not worth migrating. Flutter has its own theme, haptics and currency settings. Default split per trip is the only one with value: it is re-derived from "remember last split" |
| 9 | **Cached server data** (trips, expenses, flags) | Same blob | Yes, it is a cache | No | Re-pulled by Flutter on first sync |
| 10 | **Push tokens** | Server `device_push_tokens` (`client = capacitor`) | Yes | No | Flutter registers its own (`client = flutter`). Old rows are pruned by `send-push` when FCM reports them unregistered |
| 11 | **Superadmin / Ops Deck sessions** | Web only | n/a | n/a | Out of scope (D8) |

## 2. Recovery options (for rows 2, 6, 7)

- **A. Export then restore (recommended).** Final Capacitor release adds "Export my local data" (backup JSON for guest trips; a separate documents export). Flutter restores trips via `BackupService.restore`. Works with the shipped code today for rows 2 and 3.
- **B. Do nothing.** Cheapest; guests lose trips. Only acceptable if the guest population is near zero. Measure first (below).
- **C. Native read of the old WebView store.** Flutter reads LevelDB/IndexedDB files at first launch. High effort, platform-specific, breaks with OS/WebView updates, and runs into the private-storage rules. **Rejected** unless A fails a user study.

## 3. Measuring the exposure (before choosing)

1. Signed-in users with a long-lived queue: `app_events` has `queue_stuck` per user once growth telemetry is on (Capacitor sends it too). Query in `ops/observability.sql` section 3.
2. Guests: not visible server-side. The final Capacitor release should send one extra content-free event, `guest_trips_present` (count bucket only), through the same telemetry path. Needs an additive CHECK change (draft in `ops/ALERTS.md` section 5). Until then, assume non-zero.
3. Vault users: same, `vault_docs_present` bucket. The policy forbids reading the documents themselves; only a count bucket may be sent.

## 4. Decisions needed from the owner

| ID | Decision | Recommendation |
|----|----------|----------------|
| L1 | Rows 2, 6, 7: export-then-restore (A) or accept loss (B)? | A for guest trips; for vault and attachments an export-only step plus an honest "does not carry over" message |
| L2 | Add a Flutter vault and attachment store, or drop the features? | Defer; they are Pro/Labs (B-020, B-090). Decide before the sunset date |
| L3 | Add the two count-bucket telemetry events to size the problem? | Yes, in the final release |
| L4 | How long to keep Capacitor installable (the cutover window)? | At least two store release cycles; see `ROLLOUT.md` |
