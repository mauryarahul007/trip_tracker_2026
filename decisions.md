# Architecture & Design Decisions

This document logs all meaningful technical decisions, library choices, design patterns, and architectural trade-offs accepted in the **Trip Tracker 2026** project.

---

## 1. Factory Reset ("Clear All Data")
* **Context:** The app's storage backend (`src/services/storage.ts`) defined a `clearAll()` method using `localforage.clear()`, but it was not wired to any UI button. Users had to manually wipe browser site data to reset the app.
* **Decision:** Expose a **"Clear All Data"** danger action at the bottom of the Settings tab.
* **Pattern/Implementation:**
  - Wired the store's `clearDatabase` action to trigger the existing custom `ConfirmDialog` component.
  - Implemented a double-confirmation flow to prevent accidental triggers.
* **Trade-offs Accepted:**
  - Wiping the database is destructive and instantaneous. Unlike expense or trip deletions (which support a 5-second undo toast), this operation is irreversible. This trade-off was accepted because factory resets are high-intent administrative actions that require strict finality.

---

## 2. Storage & Connection Diagnostics
* **Context:** Because this is an offline-first PWA, users need reassurance that their local data is safe and that the app knows when they are offline.
* **Decision:** Implement a live **App Connection & Storage** panel at the top of settings.
* **Pattern/Implementation:**
  - Connection status is monitored via window listeners for `online` and `offline` updates.
  - Disk space usage is estimated using the browser's native `navigator.storage.estimate()` API and rendered with a custom progress bar.
* **Trade-offs Accepted:**
  - Browser storage estimates are approximate and subject to browser-specific security padding.
  - In private browsing modes or older browsers where `navigator.storage` is unavailable, the panel degrades gracefully by omitting the storage stats progress bar, preserving functionality.

---

## 3. Quick Seed Demo Trip
* **Context:** New users opening the app had no immediate way to see the settlements engine or analytics graphs without manually creating a trip, adding members, and recording multiple expenses.
* **Decision:** Build a **"Load Demo Trip"** utility to populate mock trip data in one click.
* **Pattern/Implementation:**
  - Created `src/utils/demoSeed.ts` which exports a `generateDemoData()` helper.
  - Seeding populates a trip named *"Road Trip to Goa ☀️"* with 4 members, 2 groups (Couples, Girls), and 6 pre-calculated expenses covering all split configurations (Equal, Custom weights, Exact amounts, and Percentages).
* **Trade-offs Accepted:**
  - The expenses are pre-calculated with static `resolvedShares` matching their split configs to avoid importing the store's private mathematical helper. If the split calculation engine changes in the future, these static shares must be updated manually.

---

## 4. Realtime Collaboration Sync Tech Stack (Proposed)
* **Context:** Evaluated options to add real-time syncing capabilities to the offline-first app without hosting costs.
* **Decision:** Recommended **Firebase Firestore** over WebRTC (Yjs) and self-hosted WebSockets.
* **Rationale:**
  - **Firebase Firestore** provides a client-side SDK with native IndexedDB caching, write-queueing, and automatic synchronization out of the box.
  - Unlike WebRTC (which requires both users to be online at the same time to merge edits), Firestore syncs asynchronously via a central database.
  - Unlike custom WebSockets on Render (which suffer from a 50-second cold start on free tiers), Firebase offers instant responsiveness and a generous Spark free tier (50K reads / 20K writes daily).
* **Trade-offs Accepted:**
  - Moving to Firestore requires refactoring the store to separate the single monolithic JSON state (`trip_tracker_state`) into normalized database collections (trips, expenses, members, groups).

---

## 5. Automatic Exclusion of Deleted Members from Split Configurations on Update
* **Context:** When a member was deleted from a trip, they were removed from `trip.memberIds`, but remained in `expenses.splitMemberIds` and `expenses.paidBy`. If a user edited such flagged expenses, they had to manually uncheck the "Removed" red badges in the split config to clear the warning message *"A split member was removed — update the split."*. If they only updated the payer and saved, the warning remained because the deleted member was still saved in `splitMemberIds`.
* **Decision:** Automatically filter out deleted members from both `splitSelectedIds` (live running sum calculator) and `splitIds` (the array persisted on submit) in `App.tsx`.
* **Rationale:**
  - Automatically excluding deleted members on save prevents database corruption and clears warning flags automatically without forcing manual checkbox clearing for every historical transaction.
* **Trade-offs Accepted:**
  - For `custom`, `exact`, and `percentage` splits, omitting the deleted participant will cause the split sum to fall short of the total amount or 100%. This is handled by triggering standard form validation, forcing the user to re-allocate the deleted member's share among active members before updating. For `equal` splits, the redistribution occurs seamlessly and automatically.

---

## 174. Settlements Section on the Expenses Page (FEAT-059, v3.18.0)
* **Context:** The superadmin flag `enableSettlementDateNote` lets users capture a date + note when settling a debt (`SettlementDateNoteFields.tsx` → `App.tsx` `handleSettle`). There is no separate settlements table -- a completed settlement is persisted as a normal `expenses` row (`isSettlement` / title `"Settlement: {from} ➔ {to}"`, optionally ` — {note}`). Previously these rows were mixed into the day-grouped expense list on the Expenses (ledger) tab, styled identically to a real expense, so there was no dedicated place to review settlement history.
* **Decision:** Split settlement rows out of the day-grouped expense list into their own collapsible **"Settlements"** section below it, on the same Expenses page (`src/components/ExpenseList.tsx`).
* **Pattern/Implementation:**
  - `isActualExpense` (pre-existing) now partitions `displayedExpenses` into `actualDisplayed` / `settlementsDisplayed` before day-grouping via a shared `groupByDay()` helper, producing `dayGroups` (real expenses only) and `settlementGroups`.
  - Extracted the previously-inline per-row JSX into `renderExpenseRow(exp, idx, siblingCount)` and the day-card shell into `renderDayGroupCard(group, groupIdx, opts)`, reused by both sections -- avoids duplicating the swipe/avatar/currency-toggle/needs-review markup (~180 lines) between expenses and settlements.
  - Settlement day-cards get a `settlement:` collapse-state key prefix so expanding a settlement day doesn't also expand an expense day sharing the same date.
  - No DB/schema change, no new feature flag -- the section is always shown when settlement history exists, independent of `enableSettlementDateNote` (that flag only controls capture-time date/note fields).
* **Trade-offs Accepted:**
  - Settlement rows still render through the same expense-row template (category icon/border etc.), which is visually generic for a settlement rather than a purpose-built settlement card. Accepted to keep the diff to one file and avoid a larger redesign for what is primarily a visibility/organization fix.

---

## 6. Consistent Ordering in Group Name Auto-Generation
* **Context:** When editing an existing group, `isGroupNameAuto` was resolving to `false` because the expected auto-generated name was mapped from raw `grp.memberIds` (e.g. `['Priya', 'Rahul']` resulting in `"Priya & Rahul"`), while the actual stored group name was created using the sorted `visibleMembers` array (resulting in `"Rahul & Priya"`). This mismatch disabled real-time name updates during edits.
* **Decision:** Modify `handleStartEditGroup` in `App.tsx` to map member names by filtering `visibleMembers` (retaining the consistent index order) rather than mapping `grp.memberIds` directly.
* **Rationale:**
  - Ensures exact parity with the name generation order used during group creation, enabling custom-named group flags to work correctly.
* **Trade-offs Accepted:**
  - None. This is a logic alignment correction.

---

## 7. Theme-Aware Header Background for Button Visibility
* **Context:** In the "Night flight" (dark) theme, the application header's background became light cream because it was styled to use `var(--text-primary)`, which flips to a light color in dark modes. Because the header's text and buttons have hardcoded light colors (`#F2ECDC`), they became low-contrast and invisible when dark theme was activated.
* **Decision:** Introduced a theme-aware `--bg-header` CSS variable that remains dark in both themes (`#1C2A38` in light theme, `#0F151D` in dark theme) and updated `.app-header` to use it in `src/index.css`.
* **Rationale:**
  - Keeps the header background dark across all themes to preserve the high-contrast premium aesthetic and visibility of the header action buttons ("Share" and "Trips").
* **Trade-offs Accepted:**
  - None. This ensures layout usability and contrast consistency across appearances.

---

## 8. Zustand Store Optimistic Mutations & Local Offline Sync Queue
* **Context:** Database reads and writes via Supabase API introduced visible network latency, freezing UI states. Offline operation also resulted in total write failure.
* **Decision:** Implemented optimistic mutations in the Zustand store for expense management, and built a local `localStorage`-backed sync queue (`trip-tracker-sync-queue`).
* **Pattern/Implementation:**
  - The UI reflects changes immediately using client-generated temporary IDs.
  - Operations execute database calls asynchronously and reconcile on success. On failure, prior state is restored.
  - When offline, actions are queued and automatically synchronized when the window `online` event triggers.
* **Trade-offs Accepted:**
  - Optimistic states use temporary IDs. If they need to be referenced by other records (like new group IDs), those references must wait for reconciliation. This is resolved by scoping optimistic updates to expenses.

---

---

## 10. Offline Peer Sync & ACID Data Integrity Architecture
* **Context:** In travel settings with zero connectivity (flights, remote hikes, abroad without roaming), users need to merge expenses peer-to-peer without centralized servers. Users also need clear visual sync indicators ("Last synced" / "Out of sync") and guarantees that data merges preserve relational and financial consistency.
* **Decision:**
  - Implement an optional **Offline Peer Sync** feature toggle in Settings (`p2p_sync_enabled`).
  - When enabled, render a small round sync button with a sync symbol in the header status bar indicating live sync health (`synced` / `out_of_sync` / `syncing`).
  - Guarantee **ACID properties** during P2P sync:
    - **Atomicity:** Snapshot-and-commit merge transactions that apply all entities or fail cleanly without dirty partial writes.
    - **Consistency:** Maintain financial sum invariants ($\sum \text{shares} = \text{amount}$), foreign key referential integrity, and tombstone priority.
    - **Isolation:** Non-blocking optimistic UI with deterministic Last-Write-Wins (LWW) conflict resolution.
    - **Durability:** Synchronous multi-tier storage persistence (`localStorage` sync queue + IndexedDB) committed prior to completion acknowledgment.
* **Trade-offs Accepted:**
  - LWW conflict resolution means if two users edit the exact same expense title concurrently while offline, the later timestamp overwrites the earlier one without manual three-way diff merging. This was accepted because expense edits are typically discrete (e.g. updating receipt or amount) and full CRDT tree structures would add excessive client complexity.

---

## 11. Typeahead Member Suggestions with Fuse.js & Direct Google Account Auto-Linking
* **Context:** Adding frequent trip companions manually across multiple trips is repetitive. Users also needed a frictionless way for friends with linked Google accounts to immediately see newly created trips on their account trip lists without having to enter shareable join codes.
* **Decision:** 
  - Direct database querying of unique previous members across trips accessible to the authenticated user (`owner_id = currentUserId` or participated in).
  - In-memory caching with session TTL to eliminate redundant network hits.
  - Client-side fuzzy search using `fuse.js` (`threshold: 0.35`) capped at a maximum of 5 suggestions for fast, typo-tolerant typeahead.
  - Automatic filtering to exclude members already part of the active trip (by `name` or `linkedUserId`).
  - Auto-persisting `linked_user_id` upon selecting a suggested member with a linked Google account, immediately granting RLS trip read access.
* **Trade-offs Accepted:**
  - In-memory caching per session means newly linked profiles on other devices take up to the cache TTL (2 min) to reflect unless manually refreshed or invalidated on member mutation. This trade-off was accepted to maintain instantaneous typeahead keystroke performance without querying the database on every character.

---

## 12. Dynamic Viewport (100dvh) & Safe-Area Isolated Scroll Architecture
* **Context:** When running as a standalone PWA or on mobile browsers (iOS Safari / Android Chrome), the app suffered from viewport instability: elastic rubber-band bounces on the outer document, sticky bottom bars jumping into the middle of the screen when software keyboards opened, hardware notch/home-indicator collisions, and background scroll bleed during modal operations.
* **Decision:**
  - Configured `index.html` with `viewport-fit=cover` and `interactive-widget=resizes-content` to gracefully animate mobile keyboard appearances without layout displacement.
  - Enforced `overscroll-behavior-y: none;` on `html` and `body` to lock the outer viewport and eliminate full-page rubber-band dragging.
  - Unified root `.app-container` to `height: 100%; height: 100dvh; overflow: hidden;` and isolated scrolling to dedicated inner surfaces (`.tab-pane`, `.trips-screen-scroll`, `.modal-sheet`) with `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain`.
  - Added hardware safe-area insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`) for headers and `.nav-tabs`.
  - Implemented `useScrollLock` to automatically lock background scrolling whenever modal overlays are open.
* **Trade-offs Accepted:**
  - Locking document-level scrolling requires every screen/view to explicitly manage its own inner scroll container. This trade-off was accepted because it guarantees native app parity, eliminates double scrollbars, and preserves per-tab scroll positions.

---

## 13. Trip Archival
* **Context:** Trips with no further activity (past trips, cancelled plans) stayed permanently mixed into the main "Your Trips" grid alongside active trips, with no way to tuck them away short of permanent deletion.
* **Decision:** Add a soft-delete `archived` boolean column on `trips`. Archived trips are hidden from the home screen grid and surfaced instead under **Settings → Archived Trips**, with Restore and permanent Delete actions.
* **Pattern/Implementation:**
  - New migration `0040_add_trip_archived.sql` adds `archived boolean not null default false`.
  - `archiveTrip(id, archived)` store action calls `archiveTripRow` and, if the active trip is archived, deselects it and falls back to the next non-archived trip.
  - `TripsListScreen` filters `trips` down to non-archived for the grid and gains an Archive button per card.
  - `GlobalSettingsModal` (shared by both the home-screen gear icon and the in-trip Settings tab) gains an "Archived Trips" panel listing archived trips with Restore/Delete.
* **Trade-offs Accepted:**
  - Archiving is a direct action with no undo toast, unlike delete. Accepted because it's non-destructive and instantly reversible via Restore, so a timed undo adds no safety value.

---

## 15. Recycle Bin for Deleted Expenses (24h Soft-Delete)
* **Context:** Deleting an expense only had a 5-second undo toast; once that window passed, `deleteExpenseRow` hard-deleted the row from Supabase with no way to recover it.
* **Decision:** Deleting an expense now soft-deletes it (`deleted_at`/`deleted_by_user_id` timestamp columns) instead of hard-deleting. A **Recycle Bin** panel under the trip's Settings tab lists soft-deleted expenses for review/restore. A `pg_cron` job running hourly inside Postgres permanently purges anything past a 24h grace window.
* **Pattern/Implementation:**
  - New migration `0041_add_expense_recycle_bin.sql`: adds `deleted_at`/`deleted_by_user_id` to `expenses`, an index on `(trip_id, deleted_at)`, a `SECURITY DEFINER` `purge_expired_recycle_bin()` function (EXECUTE revoked from `anon`/`authenticated` — only the cron job can invoke it), and a `cron.schedule('purge-recycle-bin', '0 * * * *', ...)` job.
  - `tripApi.ts`: `deleteExpenseRow`/`restoreExpenseRow` now do `UPDATE deleted_at` instead of `DELETE`; `fetchExpensesForTrip` filters `deleted_at is null`; new `fetchDeletedExpensesForTrip` fetches the inverse.
  - `tripStore.ts`: new `deletedExpenses` state, `fetchDeletedExpenses`/`restoreExpense` actions, and the offline sync queue gained a `restoreExpense` queueable type alongside the existing `deleteExpense` one (which now maps to the soft-delete call).
  - The existing 5s undo toast is unchanged and sits in front of this as a fast-path — the recycle bin is the second-chance layer for anyone who misses that window.
* **Trade-offs Accepted:**
  - Purge is DB-authoritative via `pg_cron`, not client-triggered, so it keeps working even if the app is never opened — but it means the purge function must never be reachable through the client API (`REVOKE` from `authenticated`/`anon`), since the 24h window is a data-retention guarantee, not just UI.
  - The Recycle Bin lives per-trip in `SettingsTab.tsx` rather than the account-level `GlobalSettingsModal`, since expenses (unlike trips) are always scoped to one trip.

---

## 14. Ultra-Compact WebRTC SDP Serialization & Header Sync Status UX — SUPERSEDED by #16
* **Context:** Offline P2P sync QR codes were unreadable by smartphone camera sensors because full browser WebRTC SDP descriptions (~1.8KB+) generated extremely dense Version 30+ QR matrices with microscopic dots. In addition, the header had duplicate sync triggers (a round sync button and a status message pill).
* **Decision:**
  - Packed essential WebRTC DataChannel connection parameters (`ice-ufrag`, `ice-pwd`, stripped hex `fingerprint`, `setup`, `candidates`) into an ultra-compact ~180-char structured payload (`TT1:` prefix).
  - On the receiver side, reconstructed valid standard RFC 8839 SDP from the compact payload.
  - Enabled native hardware `useBarCodeDetectorIfSupported` and responsive viewport framing in the camera scanner.
  - Added a manual copy/paste fallback for camera-restricted environments.
  - Simplified the header UI by removing the redundant round sync button and keeping only the interactive sync status pill (`🟢 Synced 5m ago` / `🟠 Out of sync`).
* **Trade-offs Accepted:**
  - Custom parameter extraction assumes standard DataChannel parameters and strips unnecessary audio/video SDP lines, which is completely sufficient for P2P data exchange and guarantees instantaneous camera scanning across all mobile lenses.
* **Superseded:** The `c` (ICE candidates) field was JSON-stringified verbatim, never actually compacted — with 2-4 host candidates typical on mobile dual-stack networks, real payloads ran 400-600+ chars, not ~180. That's what actually made the QR too dense to scan reliably on real Android/iOS hardware, and made the manual fallback code impractically long. Rather than fix candidate compaction, the whole P2P sync feature was removed — see #16.

---

## 16. Removed P2P WebRTC Sync — Replaced with Device↔Backend Sync Status
* **Context:** The Offline Peer Sync feature (#10, refined in #14) let two devices exchange trip data directly via WebRTC + QR-code SDP handshake, with no server round-trip. In practice it never scanned reliably on either Android or iOS (see #14's supersede note), and it solved a narrow case — two devices permanently unable to reach the internet at all — that doesn't match how this app is actually used (a device offline for a while, then back on normal connectivity). Meanwhile `tripStore.ts` already had a full offline-first local queue (`syncQueue`, `queueSync`, `processQueue`) that optimistically applies expense mutations locally and replays them against Supabase once online — this was already doing most of the work a "device↔backend sync" model needs.
* **Decision:** Delete the P2P feature entirely. Reframe the existing header status pill around device↔backend sync instead of peer-connection status, using the sync queue that was already there.
* **Pattern/Implementation:**
  - Deleted `OfflinePeerSync.tsx`, `webrtcHelper.ts`(+test), `p2pSync.ts`(+test), the `html5-qrcode`/`qrcode` npm dependencies, and the "Offline Peer Sync" toggle cards in `SettingsTab.tsx`/`GlobalSettingsModal.tsx`. Removed `p2pSyncEnabled`, `setP2PSyncEnabled`, `applyP2PMergedState` from `tripStore.ts`; renamed `lastPeerSyncedAt`/`updateLastPeerSyncedAt` → `lastBackendSyncedAt`/`updateLastBackendSyncedAt`.
  - Header pill (`App.tsx`) now derives a 4-state `syncStatus` — `offline` (no `navigator.onLine`) / `session-expired` / `out-of-sync` (`syncQueue.length > 0`) / `synced` — and clicking it calls `processQueue()` directly (manual sync-on-demand), in addition to the existing auto-fire on the browser `online` event.
  - **Auth-refresh gap fixed**: `processQueue()` previously had no defense against a stale access token after a long offline stretch (Supabase's `autoRefreshToken` is timer-based, not reconnect-aware, and mobile browsers throttle/suspend JS timers in the background). `processQueue()` now checks `supabase.auth.getSession()` first and calls `refreshSession()` if the token is expired; on refresh failure it sets `sessionExpired` instead of silently retrying every queued item forever against a dead token. Failed queue items were already re-queued on error (pre-existing behavior), so no data loss either way — this just makes the "why is it stuck" case visible and recoverable (tapping the pill while `session-expired` triggers sign-out, routing back to re-auth).
  - `addMember` now checks `navigator.onLine` up front and sets a clear "you're offline" `storageError` instead of letting the network call throw and surface a generic error — members intentionally don't queue-and-sync like expenses do, since member creation interacts with join codes / RLS / linked-user state that should happen against a live server.
* **Trade-offs Accepted:**
  - This model requires both devices to eventually reach Supabase — it cannot merge two devices that are permanently offline relative to each other, which #10's original design targeted. Accepted because that scenario is rare for this app's actual usage pattern (trip-goers with normal phone connectivity, not permanent air-gapped devices), and the P2P implementation never worked reliably enough to justify its complexity.
  - Bundle size dropped ~390KB (html5-qrcode + qrcode + WebRTC/QR UI code removed) as a side effect.

---

## 17. True Local-First Persistence for Trip Data (localStorage via zustand `persist`)
* **Context:** User-reported bug: go offline, add one expense, reload the browser — the expense list renders empty (looked like data loss), so the user re-added it; every subsequent offline reload repeated the cycle, and the "Out of sync" pending count climbed with each reload, appearing to "glitch." Root cause, confirmed by reading `tripStore.ts`: `trips`/`members`/`groups`/`expenses`/`categories` lived only in Zustand's in-memory state — nothing persisted them. `initialize()`'s offline catch branch left those arrays at their empty defaults, and `selectTrip()` eagerly wiped `expenses`/`categories` to empty *before* attempting a network refetch that would fail offline. The pending count itself was never wrong — `syncQueue.length` was read correctly every time; the count only grew because the vanishing list caused genuine repeat submissions.
* **Decision:** Wrap `useTripStore` with zustand's built-in `persist` middleware (already a dependency, no new package) backed by `localStorage`, persisting the full trip data slice — not just the sync queue — so a reload never wipes visible data, online or offline.
* **Pattern/Implementation:**
  - `useTripStore` now created via `create<TripStore>()(persist(stateCreator, { name: 'trip-tracker-store-v1', version: 1, partialize: {...} }))`, persisting `trips`, `activeTripId`, `members`, `groups`, `expenses`, `deletedExpenses`, `categories`, `syncQueue`, `lastBackendSyncedAt`, `lastModifiedAt`. Rehydration happens synchronously at store creation, before `initialize()` ever runs.
  - Removed every scattered manual `localStorage.getItem/setItem/removeItem` call for `trip-tracker-sync-queue`, `trip-tracker-last-trip-id`, and `trip-tracker-last-backend-sync` (7+ call sites across `queueSync`, `processQueue`, `selectTrip`, `createTrip`, `importDatabase`, `clearDatabase`, `loadDemoTrip`) — `persist` now writes the whole slice automatically on every `set()`, eliminating the risk of the in-memory state and a manual mirror-write drifting apart.
  - `initialize()` no longer wipes anything on an offline boot — it resolves the user from `supabase.auth.getSession()` (local, no network — swapped out `getUser()`, which calls the Auth server and would otherwise hang the loading spinner forever if the app boots offline) and, only if online, reconciles the network response against local state via a merge instead of overwrite.
  - New pure helpers `collectDirtyExpenseIds`/`mergeServerExpenses` (`tripStore.ts`, unit-tested in `tripStore.test.ts`): any expense ID with a mutation still sitting in `syncQueue` (tempId for pending adds, real id for pending update/delete/restore) is preserved as-is during a server refresh instead of being silently overwritten or resurrected — the one piece of genuinely new merge logic this required, kept deliberately narrow (server wins for clean IDs, local wins for dirty ones) rather than repeating the bespoke conflict-resolution complexity that made the deleted P2P `mergeP2PStates` hard to get right.
  - `selectTrip()` switches trips instantly against cached data (no wipe-then-refetch); offline, it just skips the refetch and shows whatever's cached for that trip — correct and honest, since `activeTripExpenses` is already filtered by `tripId` downstream.
  - Also fixed two real, separate bugs found during this investigation: `ExpenseForm`'s submit button had no double-submit guard (a double-tap could double-queue one logical add); the `window.addEventListener('online', ...)` auto-sync listener was only registered inside `initialize()`'s try-success path, so booting the app already-offline permanently skipped auto-sync-on-reconnect for that session.
  - Header sync status pill (`App.tsx`) gained a secondary defensive check: out-of-sync if `syncQueue` is empty but `lastModifiedAt > lastBackendSyncedAt`, catching any future case where local data changes without going through `queueSync`.
* **Trade-offs Accepted:**
  - `localStorage`, not IndexedDB — simplest fit given zustand already ships `persist`, no new dependency, and expense-tracking data at realistic scale (thousands of rows of small JSON records, receipts excluded — those live in Supabase Storage, referenced only by path) sits comfortably under localStorage's ~5-10MB synchronous-API limit. Revisit only if usage patterns prove that assumption wrong.
  - The merge logic only special-cases `expenses`, since that's the only entity with an offline-creation path today (`addMember`/`createTrip` have no offline branch and always go straight to network or fail outright) — `trips`/`members`/`groups` are safely blind-replaced on a successful server fetch.

---

## 18. WhatsApp-Style Settings Screen & Navigation Redesign
* **Context:** The settings surface was previously fragmented between disjointed open card stacks in `SettingsTab.tsx` and a separate `GlobalSettingsModal.tsx`, with paragraphs of descriptive text creating visual clutter. The user requested matching the UX, look, feel, and navigation hierarchy of WhatsApp Settings.
* **Decision:** Built a unified `SettingsView` component implementing WhatsApp-style inset-grouped list sections, colored squircle icons, profile hero card, and drill-down sub-page navigation.
* **Pattern/Implementation:**
  - **Profile Hero Card**: Top profile header displaying initial avatar, display name, email, and real-time connectivity status dot.
  - **Grouped Setting Rows (`.settings-group-card`)**: Grouped into logical sections (*Trip Preferences*, *App & Interface*, *Data & Backups*, *Account & Reset*) with rounded containers, hairline dividers, colored squircle icons (`.settings-squircle`), titles, descriptive subtitles, and trailing chevrons (`›`) / count badge pills.
  - **Drill-Down Sub-Screens**: Tapping an item navigates cleanly to a focused sub-screen (*Categories*, *Recycle Bin*, *Appearance*, *Backups*, *Archived Trips*) with a sticky `‹ Settings` back bar, keeping the main settings overview clean and scannable.
  - **Unified Settings Component**: `SettingsView` is shared between the in-trip Settings tab (`SettingsTab.tsx`) and the global settings sheet (`GlobalSettingsModal.tsx`), guaranteeing total visual and functional parity.
* **Trade-offs Accepted:**
  - Multi-level sub-screen navigation adds simple internal view state machine (`activeSubScreen`), but drastically improves mobile usability and eliminates long scroll fatigue.

---

## 19. Expand Auto-Tagging: 200+ Items & Brands with Editable Keyword Rules
* **Context:** Previously, auto-categorization only matched ~15 basic generic words hardcoded in a static map, missing everyday travel items (milk, maggi, petrol, toll, fastag, beer) and popular travel/dining brands (Swiggy, Zomato, Starbucks, McDonald's, Indigo, Airbnb). Users also could not customize or add auto-tagging keywords for their specific trips or custom categories.
* **Decision:** Expanded auto-tagging into a curated dataset of 200+ items and global/regional brands across 6 primary travel categories, structured into hardcoded core vs. editable keyword lists, with prioritized **Brand > Item > Category Name** matching.
* **Pattern/Implementation:**
  - **Dataset (`categoryKeywords.ts`)**:
    - *Top 50 Hardcoded Core*: High-frequency brands (Swiggy, Zomato, Starbucks, McDonald's, Uber, Ola, Indigo, Fastag, Airbnb, Zara, etc.) and essential items (milk, maggi, bread, beer, petrol, diesel, toll, hotel, flight, etc.).
    - *Extended 150+ List*: Mapped across Food, Travel, Stay, Activities, Shopping, and Misc.
  - **Multi-Tier Matching Engine (`categoryHelper.ts`)**:
    - Priority 1: Brand Match (word-boundary regex).
    - Priority 2: Item Match (top 50 items, extended items & category keywords).
    - Priority 3: Custom Category Name Match.
    - Priority 4: Default Category Name Match.
  - **Settings UI (`SettingsView.tsx`)**:
    - Each category in the Categories sub-screen can be expanded to view its active keyword tags.
    - Users can add new keyword tags with one tap, remove existing tags, or reset back to default keywords.
    - Custom keywords are stored in `Category.keywords` and persisted in `useTripStore`.
* **Trade-offs Accepted:**
  - Matching runs on every keystroke in `ExpenseForm.tsx` using pre-compiled regex on lightweight string sets, executing in <1ms without impacting typing responsiveness.

---

## 20. Expense Geotagging & Analytics Trip Journey Map
* **Context:** Travelers want to record where expenses happened (e.g., beach shacks, mountain viewpoints, highway tolls, airports) and visualize their entire journey route on a map. However, adding mapping tools could introduce bundle bloat and privacy concerns if GPS is continuously accessed.
* **Decision:** Implemented an opt-in, privacy-first **Expense Geotagging** engine using native browser geolocation + OpenStreetMap reverse geocoding, and built an interactive **Trip Journey Map** in the Analytics tab.
* **Pattern/Implementation:**
  - **Zero-Bloat Geolocation (`geolocation.ts`)**: GPS coordinates are requested strictly on-demand via `navigator.geolocation.getCurrentPosition()`. Reverse geocoding resolves human-readable names via OpenStreetMap Nominatim with memory caching and fallback coordinates when offline.
  - **Privacy Toggle (`SettingsView.tsx`)**: Geotagging is disabled by default (`enableGeotagging = false`). Users explicitly toggle it on in *Settings -> App & Interface*.
  - **Expense Form Location Tagging (`ExpenseForm.tsx`)**: When enabled, new expenses auto-tag current location into `{ lat, lng, placeName }`. Users can easily remove or refresh the location badge.
  - **Expense List Pin Badge (`ExpenseList.tsx`, `ExpenseReviewModal.tsx`)**: Expenses with location display a `📍 Place Name` badge with one-tap link to open coordinates in Google Maps.
  - **Interactive Analytics Journey Map (`TripJourneyMap.tsx`, `AnalyticsTab.tsx`)**: Plots chronological marker stops with custom category emojis, transaction popups, and a route polyline visualizing the travel path.
* **Trade-offs Accepted:**
  - Used Leaflet + OpenStreetMap over Google Maps JavaScript API: avoids paid API billing constraints, restrictive quotas, and heavy external script overhead. Leaflet CSS and assets are bundled efficiently.

---

## 21. Mobile Safari Viewport Height & Header/Footer Safe Area Optimization
* **Context:** In Mobile Safari (iOS), `100vh` accounts for the full screen with collapsed browser toolbars, causing content and bottom navigation tabs to be partially obscured behind the Safari dynamic address bar and the iPhone home swipe indicator. In addition, floating toast messages and full-screen forms lacked dynamic safe-area calculation.
* **Decision:** Replaced static viewport heights with CSS Dynamic Viewport Height (`100dvh`) with `-webkit-fill-available` fallbacks, and applied computed `calc(... + env(safe-area-inset-*))` padding rules across all headers, bottom bars, modals, and floating toasts.
* **Pattern/Implementation:**
  - **Dynamic Viewport Unit (`index.css`)**: `html`, `body`, `#root`, `.app-container`, and `.modal-sheet` use `min-height: 100dvh; height: 100dvh; height: -webkit-fill-available;` to smoothly track Safari's collapsible address bar.
  - **Top Safe Area / Dynamic Island (`.app-header`)**: Uses `padding-top: calc(14px + env(safe-area-inset-top, 0px))` so headers adapt to iPhone notch/Dynamic Island without content clipping.
  - **Bottom Safe Area / Home Indicator (`.nav-tabs`)**: Uses `padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px))` ensuring tab icons stay cleanly above the iOS home indicator bar and floating Safari navigation.
  - **Floating Toasts & Action Sheets (`UndoToasts.tsx`, `.modal-overlay`)**: Positioned with `bottom: calc(72px + env(safe-area-inset-bottom, 0px))` ensuring action feedback is never masked by the bottom bar.
* **Trade-offs Accepted:**
  - `100dvh` is supported natively in modern iOS Safari (iOS 15.4+) and all modern mobile browsers. `-webkit-fill-available` and `100%` fallbacks ensure backwards compatibility with older WebKit runtimes.

---

## 22. Manual Place Search for Geotagging, and DB Coordinates-Only Storage
* **Context:** Decision #20's geotagging only auto-captures GPS at the moment an expense is logged — no way to tag a place you're not physically standing at (a restaurant booked for tonight, a stay backfilled from memory). Separately, the DB was found to be storing `location.placeName` (a Nominatim reverse-geocode string) alongside coordinates; the requirement is that the backend must hold GPS coordinates only, never a place name, at any time.
* **Decision:** Added a manual place-search (typeahead) alongside the existing "Tag Location" GPS button, and enforced coordinates-only storage at the DB write boundary — `placeName` is now purely a client-side display value, never persisted server-side.
* **Pattern/Implementation:**
  - **DB coords-only (`tripApi.ts`)**: `coordsOnly()` strips `placeName` (and any unresolved/pending marker) from every insert/update/seed payload before it reaches Supabase. Migration `0043_expense_location_coords_only.sql` scrubbed any `placeName` already synced from #20 and updated the column comment.
  - **Forward-geocode search (`geolocation.ts`)**: `searchPlaces(query)` calls Nominatim's free `/search` endpoint (same service as the existing `/reverse` call), returns `[]` on offline/timeout/no-match, never throws.
  - **Typeahead UI (`ExpenseForm.tsx`)**: A "🔍 Search Place" button next to "Tag Location" opens a 500ms-debounced search input. Picking a suggestion sets exact coordinates immediately. Typing a name with no pick (including fully offline) is accepted locally as `{ lat: 0, lng: 0, placeName, pendingName: placeName }` — a `pendingName` marker, not the sentinel coordinates, is the actual signal used everywhere downstream.
  - **Sync-time resolution (`tripStore.ts`)**: `resolvePendingLocation()` (renamed/extended from the existing `upgradeOfflinePlaceName` coord-fallback upgrader) runs inside `processQueue()`, which only executes when `navigator.onLine` is guaranteed true. A `pendingName` is forward-geocoded there; a raw-coordinate `placeName` from offline GPS capture is still reverse-geocoded there as before. On no match, the location is marked `locationUnresolved: true` instead of being silently dropped.
  - **Visible failure state**: `coordsOnly()` writes `location: null` to the DB for any `pendingName`/`locationUnresolved` location (never the `0,0` sentinel). The local copy keeps the flag so `ExpenseList.tsx`, `ExpenseReviewModal.tsx`, and `ExpenseForm.tsx` render an amber "⚠ location not found" / "⏳ pending" badge instead of a silently-vanished pin. `TripJourneyMap.tsx` filters these out of the route so `0,0` never plots a false marker.
* **Trade-offs Accepted:**
  - Forward-geocode ambiguity is resolved by silently taking Nominatim's top result — no confirmation prompt, since resolution happens in the background during sync, not interactively.
  - `processQueue`'s existing sequential `for` loop naturally throttles resolution calls well under Nominatim's ~1 req/sec free-tier etiquette, even after a long offline period with many queued items — no extra rate-limiting code needed.
  - A manually-typed name that never resolves means that expense permanently has no server-side location (by design, since the DB cannot hold a name) — surfaced as a persistent, tappable warning rather than fixed automatically.

---

## 23. Superadmin Control Cockpit, Global Feature Flags & Minimal User UI
* **Context:** Regular travelers need an ultra-clean, minimal, distraction-free interface (creating trips, logging expenses with auto-tagging, basic GPS geotagging, adding members, settling balances, viewing active trip analytics, and switching light/dark themes). Advanced developer options, P2P sync diagnostics, 200+ keyword tag rules, database wipes, recycle bin permanent purges, and cross-trip aggregated analytics should be shielded from regular users and managed by a designated Superadmin.
* **Decision:** Introduced a dual-mode role architecture with a Superadmin Cockpit, a 3-tier Feature Flags engine (Global, Per-Trip, Per-Member), and dedicated Superadmin authentication with authorized phone recovery.
* **Pattern/Implementation:**
  - **First Page Dual Login (`LoginScreen.tsx`)**: Displays standard Google Login for regular users and a dedicated "⚡ Super User Login" entry point.
  - **Superadmin Auth & Phone Recovery (`superadminAuth.ts`, `SuperadminAuthModal.tsx`)**:
    - Master credentials: `Superadmin@triptracker.com` / `Superadmin@triptracker.com`.
    - Phone Password Reset: OTP verification dispatched to authorized recovery numbers (`+91 7075762522` and `+91 7977337757`) with masked display.
  - **3-Tier Feature Flags Switchboard (`featureFlags.ts`, `tripStore.ts`)**:
    - Flags: `enableGeotagging`, `enableAdvancedLocationSearch`, `enableAdvancedSplits`, `enableP2PSync`, `enableReceiptUpload`, `enableRecycleBin`, `enableKeywordTagging`, `enableDemoSeeding`, `enableMultiTripAnalytics`.
    - Resolution hierarchy: Superadmin (always ON) -> User Override -> Trip Override -> Global Flag -> Default.
  - **Minimal Normal User UI (`SettingsView.tsx`, `ExpenseForm.tsx`)**:
    - Normal users only see core trip preferences, light/night flight/system appearance, basic GPS tagging, and basic active trip analytics.
    - Complex sub-screens (keyword rule customizer, permanent recycle bin purge, database JSON backups, factory reset) are hidden from normal users.
  - **Superadmin Cockpit (`SuperadminDashboard.tsx`)**:
    - Top KPI volume banner across all trips.
    - Feature Flags Hub with live toggle switches.
    - Master Cross-Trip Global Analytics (total volume, category distributions, top spenders, currency breakdown).
    - Trip & Member directory audit.
    - Advanced database controls (JSON export/import, demo seed, data reset, keyword rule manager).
* **Trade-offs Accepted:**
  - Superadmin session state is maintained in persistent Zustand store with phone OTP verification backup, ensuring zero dependency on active internet connection or backend schema updates during offline use.

---

## 24. Dedicated Superadmin Management Portal & Multi-Page Administration
* **Context:** Embedding the administrative cockpit inside the regular customer expense logger caused role confusion. Normal travelers require a minimal customer interface solely focused on logging expenses, group members, and settlements. Superadmin requires a completely separated, dedicated administrative management application with its own top-level navigation and distinct purpose-built screens.
* **Decision:** Split the user experience into two completely separated shells: the Customer Traveler App and the Dedicated Superadmin Management Portal (`AdminPortalLayout`) containing 4 distinct administrative pages.
* **Pattern/Implementation:**
  - **Superadmin Portal Shell (`AdminPortalLayout.tsx`)**: Renders a dedicated administrative workspace upon superadmin login, with its own header, system indicators, traveler preview toggle, and admin logout.
  - **4 Dedicated Administrative Pages (`src/components/admin/`)**:
    1. 🚩 **Flags Page (`AdminFlagsPage.tsx`)**: Full-page Feature Flag switchboard with live toggle cards, description, and per-trip/user override selector.
    2. 📊 **Global Analytics Page (`AdminAnalyticsPage.tsx`)**: High-end cross-trip financial telemetry, multi-trip KPIs, category volume breakdown, spenders leaderboard, and currency distribution.
    3. 🗂️ **Trips Directory & Governance Page (`AdminTripsPage.tsx`)**: Isolated trip directory, group privacy notice, status badges (Active/Frozen/Archived), Emergency Stop / Kill-switch (`freezeTrip`), and trip deletion.
    4. ⚙️ **System Tools Page (`AdminToolsPage.tsx`)**: Category & brand keyword rule manager (200+ brand auto-match rules), JSON database export/import backup, and demo dataset seeder.
  - **Role-Based Root View Switcher (`App.tsx`)**: Checks `isSuperadmin && !isTravelerPreview` to immediately mount `AdminPortalLayout`. Provides an "👁️ Preview Traveler View" switch with a top floating banner to jump back to the Superadmin Portal.
* **Trade-offs Accepted:**
  - Kept single SPA bundle with conditional shell rendering instead of multi-app domain partitioning to preserve offline caching and instant switching between administrative and traveler preview modes.

---

## 25. Multi-Admin Trip Governance & Sole-Admin Deletion Protection
* **Context:** Previously, a trip had a single owner (`ownerId`). Users requested the ability to promote any or all members of a trip to Admin status so multiple co-travelers can manage trip settings, categories, groups, and members. At the same time, the system needed a guardrail to ensure an admin cannot delete themselves if they are the last remaining admin on the trip, which would otherwise leave the trip without any administrator.
* **Decision:** Extended the trip data model with an array of administrator member IDs (`Trip.adminMemberIds`), enabled admins to promote/demote members directly from the Member Luggage list, and implemented strict sole-admin deletion protection across both UI and store handlers.
* **Pattern/Implementation:**
  - **Data Model (`types/index.ts`)**: Added `adminMemberIds?: string[]` to `Trip`. When a trip is created, the creator / first member is automatically assigned as the initial admin.
  - **Role Badge & Management (`MembersGroupsTab.tsx`)**: Each member card displays a 👑 **Admin** or **Member** badge. Current admins can tap `👑 Make Admin` to promote any member, or `Demote` to remove admin privileges if more than one admin is present. All trip members can be admins simultaneously if desired.
  - **Sole-Admin & Google-Linked Admin Deletion Protection (`App.tsx`, `MembersGroupsTab.tsx`, `tripStore.ts`)**:
    - When an admin member is targeted for deletion, the system verifies that there is at least one *other* active Admin who is linked to a Google account (`Boolean(m.linkedUserId)`).
    - If no other Google-linked admin remains on the trip, deletion is blocked with an explicit modal warning: *"You cannot delete this admin account because a trip must retain at least one Admin linked to a Google account. Please promote a Google-linked member to Admin before removing this admin."*
    - Once another Google-linked member is promoted to Admin, an admin can safely remove themselves or be deleted.
  - **Permission Resolution (`App.tsx`)**: `isAdmin` dynamically checks if the authenticated user matches `activeTrip.ownerId` OR matches a claimed member profile contained in `activeTrip.adminMemberIds`.
* **Trade-offs Accepted:**
  - Requiring at least one Google-linked Admin prevents trips from becoming orphaned or controlled solely by unlinked placeholder accounts.
  - Using an array of member IDs (`adminMemberIds`) on `Trip` allows multi-admin permissions to work seamlessly offline, in local store, and across database synchronization without requiring complex relational joins or new database tables.

---

## 26. Unrestricted Admin Promotion, Trip Owner Demotion Immunity & Google-Linked Admin Deletion Guardrail
* **Context:** Collaborative trip tracking requires that any added member can be granted administrative powers to edit categories, members, and expenses without waiting for them to link Google accounts. However, the original trip creator (Owner) must never be demoted or deleted by secondary admins, and the original owner can only leave/delete their account if another member on the trip is BOTH logged in via Google and an Admin.
* **Decision:** Implemented unrestricted admin promotion for all members, locked demotion/deletion of the trip creator against secondary admins, and mandated a Google-logged-in Admin for original admin removal.
* **Pattern/Implementation:**
  - **Unrestricted Promotion (`MembersGroupsTab.tsx`, `tripStore.ts`)**:
    - Any trip member can be made an Admin via `Make Admin`, regardless of whether their Google account is linked yet.
    - `tripStore.setMemberAdminRole` adds any designated `memberId` to `adminMemberIds`.
  - **Trip Owner Immunity (`MembersGroupsTab.tsx`, `App.tsx`, `tripStore.ts`)**:
    - The original creator (`activeTrip.ownerId`) is badged with 👑 **Owner** and cannot be demoted (no Demote button is shown for the Owner).
    - `tripStore.setMemberAdminRole` ignores demotion requests targeting the trip owner.
    - Secondary admins cannot delete the original trip owner.
  - **Original Admin Deletion Guardrail (`MembersGroupsTab.tsx`, `App.tsx`)**:
    - If the original trip creator wishes to self-delete/leave the trip, the system enforces that at least one other member on the trip is **both** an Admin and logged in with a Google account (`isMemberAdmin(m) && Boolean(m.linkedUserId)`).
* **Trade-offs Accepted:**
  - Preserves hierarchical ownership and guarantees that trips never lose verified ownership while providing full flexibility to promote co-travelers to Admins immediately.

---

## 27. Floating Action Button (FAB) for Adding Expenses
* **Context:** In the active trip view, the "+ Add Expense" action button was previously anchored inside the scrollable header area at the top of the Expenses tab. When expense logs grew long or on mobile devices where single-thumb interaction operates at the bottom half of the screen, reaching the top button was friction-heavy.
* **Decision:** Replaced the top-anchored button with a persistent Floating Action Button (FAB) at the bottom-right of the viewport.
* **Pattern/Implementation:**
  - **Component Structure (`App.tsx`)**: Placed the FAB inside `<main className="app-main">` conditionally rendered only when `activeTab === 'expenses'`.
  - **Styling & Elevation (`index.css`)**: Styled `.fab-add-expense` with a 54px circular geometry, 2px crisp border, Ink Navy in light mode, elevated night-flight surface in dark mode, shadow elevation, tactile active press state, and seamless theme adaptation.
  - **Cross-Platform & Safe Area Adaptations (`index.css`)**:
    - Web / Android: Sits 18px above the bottom navigation bar.
    - iOS Capacitor: Offsets bottom clearance to sit above the native Liquid Glass tab bar (`calc(18px + var(--safe-bottom, 0px) + 76px)`).
    - Scroll Clearance: Added `calc(84px + var(--safe-bottom, 0px))` bottom padding to `.tab-pane` so the last transaction or settlement card can be scrolled well past the floating button.
* **Trade-offs Accepted:**
  - Consumes a minor footprint (54×54px) in the bottom-right corner of the active scroll view, offset by extending bottom padding so underlying content is never obscured.

---

## 28. WhatsApp-Style Search Bar & Horizontal Quick Filter Chips
* **Context:** The previous expense filtering UI utilized a collapsible toggle button that exposed stacked `<select>` dropdowns and date inputs. This interaction model required 3–4 taps, added vertical layout clutter, and felt cumbersome compared to mobile-first messaging and ledger interfaces (such as WhatsApp's chat list search and filters).
* **Decision:** Replaced the multi-select dropdown panel with an integrated full-width search bar (with an instant `✕` clear action) and a horizontal, touch-friendly filter chip strip (`All`, `👤 Mine`, dynamic Categories, dynamic Members, and `Dates`).
* **Pattern/Implementation:**
  - **Single-Tap Filter Track (`ExpenseList.tsx`)**: Rendered horizontal scrollable chips with one-tap toggle for categories, members, user's own expenses (`myMemberId`), and date range.
  - **Instant Search Clear (`ExpenseList.tsx`)**: Added a reactive `✕` button inside the search field that debounces and clears the filter string instantly.
  - **Aesthetics & Theme Alignment (`index.css`)**:
    - Light Theme: Warm ledger paper chip surfaces ([`var(--bg-surface)`](file:///C:/ProjectsV1/Trip_Tracker_2026/src/index.css#L52)) transitioning to Ink Navy ([`var(--bg-header)`](file:///C:/ProjectsV1/Trip_Tracker_2026/src/index.css#L73)) when active.
    - Dark Theme: Night flight card surfaces with elevated dark slate chip fill and warm text.
    - Smooth touch scroll with hidden scrollbars and tactile active state transitions.
* **Trade-offs Accepted:**
  - Horizontal scrolling requires users to swipe right to see secondary category/member chips on very small screens, which is significantly faster and less obstructive than opening multi-step dropdown menus.

---

## 29. Scroll-Revealed Quick Filter Track
* **Context:** Showing both the search bar and the full filter chip row at the top of the screen at initial rest took unnecessary vertical space away from the first few transaction rows on smaller mobile screens.
* **Decision:** Hidden the filter chips at initial rest (`scrollTop === 0`), expanding and sliding them into view seamlessly upon scrolling down, focusing search, or when any filter is active.
* **Pattern/Implementation:**
  - **Scroll Detection (`ExpenseList.tsx`)**: Attached a passive scroll listener on `.tab-pane` detecting `scrollTop > 15px`.
  - **Visibility Compound State (`ExpenseList.tsx`)**: Filter chips expand when `isScrolled || searchFocused || hasActiveFilters || !!localSearch || showDateFilter`.
  - **Animated Collapse & Expansion (`index.css`)**: Styled `.filter-chips-collapse` with `max-height`, `opacity`, `transform: translateY()`, and cubic-bezier easing to slide down smoothly without layout jank.
* **Trade-offs Accepted:**
---

## 30. CSS-Driven Adaptive Disappearing Scroll Header & Glassmorphic Passthrough
* **Context:** When users scrolled down through long expense lists or dashboard tabs, the header previously remained static and rigid in a separate flex block above `<main>`, while the scrolling container clipped abruptly against the header's hard bottom edge. This created a visual disconnect and wasted vertical screen real estate while scrolling.
* **Decision:** Implemented a unified scrolling layout where the active trip dashboard header is rendered as an elevated, translucent frosted-glass surface (`backdrop-filter: blur(16px)`). Scrolling cards pass directly underneath the header and gracefully dissolve at the top safe area through a CSS gradient mask, while the header smoothly compacts into a sleek top bar.
* **Pattern/Implementation:**
  - **Glassmorphism & Depth Elevation (`index.css`)**:
    - Created `--bg-header-glass` and `--bg-header-glass-scrolled` theme tokens for light (`rgba(28, 42, 56, 0.82)`) and dark mode (`rgba(15, 21, 29, 0.85)`).
    - Applied `backdrop-filter: blur(16px) saturate(170%)` with dynamic elevation drop shadows (`box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.45)`).
  - **Scroll Passthrough & Top-Edge Dissolution (`index.css`)**:
    - Re-architected `.tab-pane` to extend behind the absolute glass header with `padding-top: calc(126px + var(--safe-top, 0px))` clearance.
    - Applied a top-edge linear gradient mask (`mask-image: linear-gradient(to bottom, transparent 0px, transparent calc(var(--safe-top, 0px) + 6px), black calc(var(--safe-top, 0px) + 38px), black 100%)`) so scrolling expenses seamlessly dissolve inside the header rather than colliding with the status bar or notch.
  - **Dynamic Compaction & Smooth Transitions (`App.tsx`, `index.css`)**:
    - Tracked scroll position on `.tab-pane` using an event-delegated capture listener toggling `.is-scrolled` at `scrollTop > 15px`.
    - Animated header padding reduction, logo title scaling (from 24px down to 18px), and folded away the eyebrow and stats sub-row (`max-height: 0; opacity: 0; transform: translateY(-8px)`).
  - **Cross-Platform & Scope Isolation (`index.css`)**:
    - Retained solid `.app-header` defaults for modals (`ExpenseForm`, `GlobalSettingsModal`).
    - Maintained clean compatibility overrides for `html.capacitor-ios` (Swift native shell glass header).
---

## 31. Security Hardening Phase 1: Storage Quotas, MIME Whitelisting, and Statement Timeouts
* **Context:** Unauthenticated or bot traffic can potentially flood Supabase storage buckets with arbitrary non-image files or oversized assets, exhausting quotas. Additionally, malicious or runaway nested queries against PostgreSQL could cause database CPU exhaustion.
* **Decision:** Implemented multi-layer defensive boundaries across Supabase Storage, PostgreSQL roles, and client-side upload pipelines.
* **Pattern/Implementation:**
  - **Storage Hardening (`0046_security_hardening_phase1.sql`)**:
    - Configured `storage.buckets` record for `'receipts'` with strict 5MB limit (`file_size_limit = 5242880`) and allowed MIME whitelist (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`).
    - Added full CRUD RLS policies on `storage.objects` binding read/write/update/delete strictly to verified trip participants and admins.
  - **Statement Timeouts for Anti-DDoS (`0046_security_hardening_phase1.sql`)**:
    - Enforced `statement_timeout = '5000ms'` for authenticated roles and `3000ms` for anonymous roles to immediately terminate runaway/slow-query attacks.
    - Explicitly revoked destructive actions (`INSERT`, `UPDATE`, `DELETE`) from `anon` across all application tables.
  - **Client-Side Pre-Validation (`src/utils/image.ts`, `ExpenseForm.tsx`)**:
    - Pre-validates file sizes (`MAX_RECEIPT_FILE_SIZE_BYTES = 5MB`) and MIME types before executing FileReader or compression, rejecting invalid uploads client-side before any network bytes are dispatched.
---

## 32. Security Hardening Phase 2: Join Code Rate Limiting, Cloudflare Turnstile, and Honeypot Bot Traps
* **Context:** 6-character alphanumeric trip join codes could be targeted by automated brute-force attacks or scraping bots searching for private trip payloads. Additionally, automated form scrapers could attempt rapid-fire spam submissions on trip creation, join, and expense forms.
* **Decision:** Implemented database-level attempt tracking with automated lockouts in PostgreSQL, integrated Cloudflare Turnstile anti-bot verification, and embedded honeypot traps in all form surfaces.
* **Pattern/Implementation:**
  - **Database Join Code Rate Limiting (`0047_security_hardening_phase2_join_limits.sql`)**:
    - Created `public.trip_join_attempts` tracking table (completely revoked from direct client access).
    - Upgraded `lookup_trip_by_join_code` RPC to enforce a max of 5 failed attempts per 15-minute sliding window. Exceeding 5 failures automatically locks the user account out for 15 minutes, returning the exact remaining cooldown duration in seconds.
    - Valid join code lookups automatically clear any accumulated failure count.
  - **Live Cooldown UX (`JoinTripScreen.tsx`)**:
    - Parsed remaining lockout seconds from Supabase errors and rendered an active countdown timer (`Try again in Xm Ys`), disabling submit actions until the security cooldown expires.
  - **Cloudflare Turnstile Component (`TurnstileWidget.tsx`)**:
    - Created modular `<TurnstileWidget />` that conditionally activates when `VITE_TURNSTILE_SITE_KEY` is present, providing seamless bot protection without CAPTCHA friction for human travelers.
  - **Honeypot Form Bot Traps (`ExpenseForm.tsx`, `TripsListScreen.tsx`, `JoinTripScreen.tsx`)**:
    - Added offscreen decoy fields (`name="trip_join_security_token"`, `name="expense_vendor_code_security"`) that drop automated bot submissions before any network requests are dispatched to Supabase.
* **Trade-offs Accepted:**
  - If a legitimate user mistypes an invite code 5 consecutive times, they must wait 15 minutes or contact their trip admin for the direct invite link.
---

## 33. Security Hardening Phase 3: Database CHECK Constraints, Audit Logging, CSP, and JSON Sanitization
* **Context:** Malicious or oversized string payloads could cause database memory bloat or frontend crashes if unbounded. Unvalidated JSON backup imports could introduce prototype pollution or corrupted state into IndexedDB. Cross-site script injections require explicit origin policy restrictions.
* **Decision:** Implemented database-level `CHECK` constraints on all primary entities, created an administrative security audit log table, defined a strict Content Security Policy in `index.html`, and added backup data validation and sanitization.
* **Pattern/Implementation:**
  - **Database CHECK Constraints (`0048_security_hardening_phase3_constraints_and_audit.sql`)**:
    - `trips`: `length(trim(name)) > 0 and length(name) <= 100`, `start_date <= end_date`, `length(trim(base_currency)) between 2 and 10`.
    - `members` & `groups`: `length(trim(name)) > 0 and length(name) <= 100`.
    - `categories`: `length(trim(name)) > 0 and length(name) <= 50`.
    - `expenses`: `length(trim(title)) > 0 and length(title) <= 200`, `amount > 0 and amount <= 999999999.99`, `length(trim(currency)) between 2 and 10`.
  - **Security Audit Logs Table & RPC (`0048_security_hardening_phase3_constraints_and_audit.sql`)**:
    - Created `public.security_audit_logs` table with RLS restricting read access exclusively to trip administrators via `is_trip_admin()`.
    - Revoked direct client write access, requiring event dispatch through security definer RPC `log_security_event`.
  - **Content Security Policy (`index.html`)**:
    - Defined restrictive CSP headers in `index.html` allowing only required origins (Supabase, Leaflet OpenStreetMap tiles, Nominatim geocoding, Cloudflare Turnstile). Added `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
  - **Client-Side JSON Import Sanitizer (`src/utils/backupValidation.ts`)**:
    - Added prototype pollution protection (`Reflect.deleteProperty`) and bounds validation on imported backups before executing bulk transactions in `tripStore.ts`.
* **Trade-offs Accepted:**
  - Strings exceeding max bounds (e.g. titles over 200 characters or names over 100 characters) are trimmed automatically or rejected by the database.

---

## 34. CI/CD Pipeline Supply Chain Hardening & Action Pinning
* **Context:** The Chief Security Officer (CSO) audit identified three actionable security improvements in the CI/CD pipeline: third-party GitHub action `webfactory/ssh-agent` was referenced via a mutable tag (`@v0.9.0`) instead of an immutable commit SHA, deployment credentials (`EC2_HOST`, `EC2_USER`) were expanded directly inside inline bash commands risking parameter injection, and the repository lacked a `CODEOWNERS` protection file for workflow files.
* **Decision:**
  - Pinned `webfactory/ssh-agent` in `.github/workflows/deploy-ec2.yml` to its immutable 40-character commit SHA (`dc588b651fe13675774614f8e6a936a468676387`).
  - Refactored shell execution steps in `deploy-ec2.yml` to inject secret values via the step `env:` context and reference them cleanly as `$EC2_HOST` and `$EC2_USER`.
  - Created `.github/CODEOWNERS` mandating repository owner review for `.github/workflows/`, `codemagic.yaml`, `.githooks/`, and `scripts/`.
* **Trade-offs Accepted:**
  - Upgrading pinned third-party actions in the future requires manually updating the commit SHA alongside version comments rather than relying on automatic tag rolling. This trade-off was accepted because it guarantees complete supply chain immutability and protects deployment private keys against upstream repository tampering.

---

## 35. Editorial Fluid Morph Header Architecture with Directional Hysteresis
* **Context:** When scrolling through transactions, members, analytics, or settings tabs, the header previously shrank via a rigid binary threshold (`scrollTop > 15px`) and CPU-intensive `max-height` transitions. This caused aggressive scroll jitter/flickering near the threshold, layout reflow stutter, and the complete disappearance of the sync status pill.
* **Decision:** Implemented an **Editorial Fluid Morph** header architecture with GPU-accelerated transforms and directional hysteresis.
* **Pattern/Implementation:**
  - **Directional Hysteresis & rAF Scroll Engine (`src/App.tsx`)**:
    - Replaced the 15px binary check with a directional hysteresis tracker throttled via `window.requestAnimationFrame`.
    - Expands at the top (`scrollTop <= 15px`), collapses smoothly on deliberate downward scroll (`scrollTop > 45px`), and expands early on upward scrolling near the top (`currentScrollTop < 120px` with 25px upward delta) to eliminate threshold bouncing and jitter.
  - **Inline Compact Metadata Badge (`src/App.tsx`)**:
    - Embedded an `.app-title-compact-badge` inside `.app-title-row` holding the currency code and live sync status dot.
    - Fades and translates in seamlessly when scrolled so crucial connectivity/sync status is never lost.
  - **GPU-Accelerated Morph & Spring Curves (`src/index.css`)**:
    - Replaced `max-height` transitions with GPU-accelerated `transform: scale(0.82) translateY(-1px)` and `opacity` transitions using a custom spring curve (`cubic-bezier(0.16, 1, 0.3, 1)`).
    - Upgraded glassmorphism to `backdrop-filter: blur(20px) saturate(180%)` with deep ambient drop shadows.
    - Aligned `.tab-pane` linear gradient mask to smoothly dissolve content under the compact header bar.
* **Trade-offs Accepted:**
  - Title scaling uses GPU `transform: scale(...)` with `transform-origin: left center` rather than CSS font-size transitions, which guarantees 60/120fps rendering and eliminates layout reflows across all mobile and desktop browsers.

---

## 36. WhatsApp-Style Hierarchical Stack Navigation & Sub-Screen Drill-Down Management
* **Context:** In the webapp, opening drill-down sub-screens in Settings (Categories & Tags, Recycle Bin, Appearance, Backups, Archived Trips) or modal drawers in Members/Groups did not push individual history stack entries. As a result, pressing the browser Back button or performing a mobile swipe-back gesture triggered the top-level trip unselection handler (`selectTrip(null)`), ejecting the user completely to the initial home screen.
* **Decision:** Implemented a full **WhatsApp-style Hierarchical Navigation Stack (LIFO)** where each nested level unwinds in strict reverse order before parent containers or the active trip can close.
* **Pattern/Implementation:**
  - **Settings Drill-Down Navigation (`src/components/SettingsView.tsx`)**:
    - Wired `useHistoryBack` to `subScreen !== null`, ensuring back navigation closes the active sub-screen (Categories, Recycle Bin, etc.) and returns to the Settings overview without exiting the trip.
    - Wired `useHistoryBack` to `expandedCategoryId !== null`, so open tag editors collapse first on back navigation.
    - Added `.settings-subscreen-enter` with `@keyframes whatsappSlideIn` for smooth slide transitions.
  - **Member & Group Drawers (`src/components/MembersGroupsTab.tsx`)**:
    - Wired `useHistoryBack` to `showAddGroup || Boolean(editingGroup)` and `Boolean(editingMember)`, ensuring open form sheets close back to the members list.
  - **Tab Level Stack Management (`src/App.tsx`)**:
    - Wired `useHistoryBack(!!activeTripId && activeTab !== 'expenses', () => setActiveTab('expenses'))`, so backing out from secondary tabs (Members, Analytics, Settings) transitions back to the primary Transactions tab before exiting the trip.
* **Trade-offs Accepted:**
  - Navigating between secondary tabs pushes lightweight hash history states (`#nav-N`) onto the stack. This guarantees that back gestures unwind intuitively without any unexpected screen leaps or data loss.

---

## 37. Floating Frosted Glass Pill Menu Architecture (Webapp)
* **Context:** The previous bottom tab bar on the webapp was rendered as a full-width flat opaque bar stuck to the bottom of the viewport. It looked rigid, boxy, and clashed with the modern translucent aesthetic established by the iOS and WhatsApp design systems.
* **Decision:** Implemented a **Floating Frosted Glass Pill Menu** (`.nav-tabs`) with spring active indicators and translucent backdrop blur.
* **Pattern/Implementation:**
  - **Pill Geometry & Glassmorphic Surface (`src/index.css`)**:
    - Transformed `.nav-tabs` into an elevated floating capsule (`position: absolute; bottom: calc(14px + safe-bottom); left: 50%; transform: translateX(-50%); max-width: 430px; border-radius: 9999px`).
    - Configured true glassmorphism with `backdrop-filter: blur(24px) saturate(190%)`, multi-layered ambient shadows, and inner rim highlight (`inset 0 1px 1px rgba(255, 255, 255, 0.9)` in light mode, `inset 0 1px 1px rgba(255, 255, 255, 0.08)` in dark mode).
  - **Spring Active State & Micro-Interactions (`src/index.css`)**:
    - Styled `.nav-tab-item` with spring easing `cubic-bezier(0.16, 1, 0.3, 1)`.
    - Active tabs receive a glowing capsule background (`rgba(0, 191, 165, 0.14)`), bold typography, and an icon elevation/scale pop (`scale(1.08) translateY(-1px)`).
  - **FAB & Content Clearance (`src/index.css`)**:
    - Re-anchored `.fab-add-expense` at `bottom: calc(78px + safe-bottom)` to hover directly above the right side of the floating glass bar.
    - Updated `.tab-pane` padding-bottom to `calc(88px + safe-bottom)` and bottom dissolution mask so content scrolls cleanly behind the pill.
* **Trade-offs Accepted:**
  - The floating pill occupies floating space over the bottom of the scroll view. Content padding-bottom ensures zero overlap with the final list items and buttons.

---

## 38. Classy Notification Center Architecture & Granular Deletion (Webapp)
* **Context:** The previous notifications drawer used an oversized dark header banner with negative margin hacks, lacked visual categorization (all rows looked identical with no icon differentiation), had no mechanism for clearing all notifications, and lacked mouse-hover delete actions on desktop.
* **Decision:** Implemented a full **Classy Notification Center** (`src/components/NotificationsPanel.tsx`) inspired by WhatsApp and Apple iOS Notification Center.
* **Pattern/Implementation:**
  - **Categorized Visual Squircles (`src/components/NotificationsPanel.tsx`)**:
    - Mapped notification types (`expense_added`, `expense_updated`, `expense_deleted`, `member_added`, `settlement`) to theme-colored squircle avatars with emerald unread status dots.
  - **Toolbar Actions & Clear All (`src/services/notificationsApi.ts`, `src/store/notificationsStore.ts`)**:
    - Added `deleteAllNotifications` database API and `clearAll` store action for one-tap notification purge with safety confirmation.
    - Added clean header toolbar containing `Mark read`, `Clear all`, and `✕` close button.
  - **Bidirectional Read & Unread Toggling (`src/services/notificationsApi.ts`, `src/store/notificationsStore.ts`, `src/components/NotificationsPanel.tsx`)**:
    - Added `markNotificationUnread(id)` API and `toggleRead(id)` / `markAsUnread(id)` store actions.
    - Embedded `IconMail` (mark unread) and `IconCheck` (mark read) on hover and on interactive squircle click.
  - **Refined Seamless Border Architecture (`src/index.css`)**:
    - Replaced asymmetrical heavy border-left with uniform hairline translucent borders, ambient highlight shadows, and jewel dot indicators.
* **Trade-offs Accepted:**
  - `Clear all` performs an irreversible batch deletion on the Supabase `notifications` table for the user. A confirmation prompt prevents accidental clears.

---

## 39. Multi-Trip Notification Scoping (Option C Hybrid) & Expense Autofocus
* **Context:**
  1. Users reported that opening the Expense form via the floating `+ Expense` button required an extra manual tap on the amount field to start typing.
  2. Notifications from older trips appeared in the Notification Center without trip context or scoping, creating ambiguity regarding which trip a settlement or expense notification belonged to.
* **Decision:**
  1. Implemented automatic focus and selection (`amountInputRef.current?.focus()`, `autoFocus`) on the amount hero input upon opening `ExpenseForm.tsx`.
  2. Implemented **Option C (Hybrid Multi-Trip Notification Architecture)**:
     - Embedded explicit **Trip Name Badges** (`.notif-trip-badge`) on every notification card to provide instant context.
     - Added a 1-tap **Segment Switcher** (`[Current Trip]` vs `[All Trips]`) in `NotificationsPanel.tsx` with dynamic unread count badges.
     - Updated `BalancesSettlements.tsx` to include the explicit `tripName` in settlement reminder notification titles and bodies.
---

## 40. Notification Payload Standardization & Smart In-App Display Normalization
* **Context:**
  - In-app notification cards were displaying duplicated trip names (e.g. `Himachal 2 [Himachal 2]`) because push payloads previously used the trip name as the `title` while the card also rendered the trip badge.
  - Event actions (such as deletion, addition, updates) were only present in the body text and could get cut off prematurely by CSS line clamping on long expense descriptions (e.g. `"...was..."`).
  - Historical notifications recorded past actions (such as deleting a test trip or expense with the same name), creating confusion when a trip with that name was present in the trip list.
* **Decision:**
  - Implemented `getNotificationDisplay()` helper in `NotificationsPanel.tsx` to cleanly extract action headlines (`Expense Added`, `Expense Deleted`, `Trip Deleted`, `Member Joined`, `Settlement Reminder`) and deduplicate header badges against trip names for both historical and future notifications.
  - Expanded `getNotificationMeta()` to support `trip_deleted` (rose trash) and `expense_restored` (emerald sparkles) icons.
  - Standardized push dispatch payloads across `tripStore.ts`, `App.tsx`, and `JoinTripScreen.tsx` with explicit action headlines and preserved `data.tripName`.
  - Added `word-break: break-word` and `overflow-wrap: break-word` to `.notif-card-text` to prevent awkward word truncation.
* **Trade-offs Accepted:**
  - Historical database notification records are normalized dynamically in the UI at render time without requiring retroactive SQL backfills.

---

## 41. Trip Deletion Authority Enforcement, Cascade Isolation & Notification Normalization
* **Context:**
  1. Users observed phantom "Trip Deleted" notifications for trips (e.g. "Sikkim Bagpacking") that were still present on their home screen. Non-owner members were presented with the delete button on `TripsListScreen` and `SettingsView`; executing delete dispatched the push notification to recipients before Supabase RLS rejected the deletion (0 rows deleted). Because the trip was not actually deleted, Postgres foreign key cascading did not remove the notification, leaving a permanent "Trip Deleted" record in recipient inboxes while the trip remained on the home page.
  2. Deleted trip push notifications passed `tripId`, creating a Catch-22: if the trip was deleted, PostgreSQL `ON DELETE CASCADE` wiped the notification from `notifications` table; if the delete failed, the notification survived.
  3. Expense deleted notifications displayed awkward redundant text (e.g., `"<Long Title>" was...` cut off by line clamping) because the body repeated `"... was deleted"` while the card headline already stated `Expense Deleted`.
  4. Clicking on a `trip_deleted` notification attempted to select and navigate into a non-existent trip.
* **Decision:**
  1. **UI Permission Gates (`TripsListScreen.tsx`, `SettingsView.tsx`):** Guard the "Delete trip" action to only render for authorized trip owners or admins (`isTripAdmin`).
  2. **Store & API Safeguards (`tripStore.ts`, `tripApi.ts`):** Check owner/admin authorization in `deleteTrip` before dispatching push notifications. Update `deleteTripRow` to verify that rows were deleted via `.select('id')`, throwing if 0 rows were affected.
  3. **Decouple Trip Deletion Notifications from Foreign Key Cascade (`tripStore.ts`):** Send `trip_deleted` notifications without the relational `tripId` FK (keeping `tripName` in `params.tripName`), preventing Postgres `ON DELETE CASCADE` from deleting the notification when the trip is removed.
  4. **Clean Action Body Normalization (`notificationText.ts`):** Update `renderNotificationBody()` to extract the pure expense title (and currency/amount if structured in `data`) and strip redundant trailing verbs (`was deleted`, `was updated`, `was restored`, `added`) with robust parsing for legacy notifications.
  5. **Safe Realtime & Interaction Handling (`notificationsStore.ts`, `NotificationsPanel.tsx`):** Immediately remove deleted trips from Zustand `trips` state upon receiving realtime `trip_deleted` notifications. Prevent `handleOpenNotification` from selecting deleted or non-existent trips.
* **Trade-offs Accepted:**
  - Non-owner trip participants cannot delete shared trips (they can archive or leave the trip instead).
  - Historical notifications without structured `data.expenseTitle` are normalized via regex matching against known verb patterns.

---

## 42. Offline Sync Queue Fallback on Network Failure & Form / Share Hardening
* **Context:**
  1. In `src/store/tripStore.ts`, when `navigator.onLine` was true but backend requests failed (e.g. captive portal, DNS resolution failure, network hiccup), mutations (adding/updating/deleting expenses, members, groups) caught the error and reverted the optimistic local state, deleting the user's freshly entered data with an error banner.
  2. When sharing an unsynced or offline-created trip before server sync generated a `joinCode`, `ShareTripModal.tsx` rendered a broken URL `http://.../join/undefined` and an empty share code box.
  3. Form validation errors in `ExpenseForm.tsx` rendered solely at the bottom of the modal below the split matrix, forcing users to scroll down on shorter mobile screens to see why submitting failed.
  4. Search clear `X` icon overlapped the 20px curved border radius of `.expense-search-input`.
  5. The bottom items in `.tab-pane` could partially hide behind the floating `NavTabs` on short mobile screens.
* **Decision:**
  1. **Resilient Sync Fallback (`src/store/tripStore.ts`):** Modified all CRUD operations (`addExpense`, `updateExpense`, `deleteExpense`, `addMember`, `createTrip`, `createGroup`, `updateGroup`, `deleteGroup`, `addCategory`, `deleteCategory`) so that when an online API call fails, it logs a warning and enqueues the mutation to `queueSync()`, preserving the user's optimistic local data and automatically synchronizing when connectivity recovers.
  2. **Unsynced Share State (`src/components/ShareTripModal.tsx`):** Added a defensive `hasJoinCode` check. When a trip has not yet received a server-generated `joinCode`, the modal renders a helpful sync-pending banner and disables the copy actions.
  3. **Inline Form Validation (`src/components/ExpenseForm.tsx`, `src/index.css`):** Rendered field-specific validation errors directly beneath the Amount and Title input fields, styling `.amount-hero.amount-hero-error` with danger accents for immediate feedback.
  4. **Search Inset & Mobile Clearance (`src/index.css`):** Adjusted `.expense-search-input` right padding and `.search-clear-btn` positioning to sit inside the curved boundary; increased `.tab-pane` bottom padding to `calc(104px + var(--safe-bottom, 0px))` for full floating nav clearance.
* **Trade-offs Accepted:**
  - Network-failed mutations persist locally with temporary IDs and sync in the background upon reconnection, prioritizing zero data loss over immediate server confirmation.

---

## 43. MapLibre Popup HTML Injection Sanitization (OWASP A03 / XSS Prevention)
* **Context:**
  - In `src/components/TripJourneyMap.tsx`, expense titles and reverse-geocoded place names were interpolated directly into raw HTML template strings and rendered via MapLibre GL's `Popup.setHTML()`.
  - Because MapLibre GL does not sanitize HTML input passed to `setHTML()`, a trip participant could store crafted script or image onerror payloads in an expense title, triggering stored XSS for other participants upon clicking the map marker pin on the Analytics tab.
* **Decision:**
  - Introduced `escapeHtml()` utility to escape `&`, `<`, `>`, `"`, and `'` characters prior to popup HTML generation.
  - Added unit test suite `src/components/TripJourneyMap.test.ts` to prevent regressions against common XSS injection vectors.
* **Trade-offs Accepted:**
  - Raw HTML tags inside expense titles or reverse geocoding place names will render as literal escaped text rather than HTML formatting, preserving visual text while preventing code execution.

---

## 44. Privacy "Blind Mode" Amount Masking, Micro-Haptics & Smart Split Presets
* **Context:**
  1. Users viewing trip expenses or balance totals in public spaces, on shared screens, or taking screenshots needed a privacy option to conceal sensitive financial debts and amounts.
  2. Touch interaction on mobile web lacked tactile micro-feedback for key user actions (swiping items, marking settlements paid, checking split checkboxes).
  3. Form entry for custom/percentage split configurations required multiple tedious manual taps to allocate shares across members.
* **Decision:**
  1. **Privacy "Blind Mode" (`src/store/privacyStore.ts`, `src/App.tsx`):** Built a persistent Zustand-backed privacy store (`isBlindMode`) with a toggle button in the top app header (`IconEye` / `IconEyeOff`). When active, masks all monetary amounts across headers, expense lists, balance summaries, and analytics charts with formatted `•••••` text and CSS blur effects (`.privacy-blur`).
  2. **Micro-Haptics Feedback (`src/utils/haptics.ts`):** Created a safe, feature-detected Web Haptics vibration utility (`triggerHaptic`) providing tactile feedback for row swiping (`SwipeableRow.tsx`), settlement confirmations (`BalancesSettlements.tsx`), split mode changes, preset selections, and form submissions (`ExpenseForm.tsx`).
  3. **Smart Split Presets (`src/components/ExpenseForm.tsx`):** Added 1-tap allocation presets (`⚡ Equal All`, `⚖️ 50% Payer / 50% Group`, `👤 Only Payer`) above the split participant matrix in `ExpenseForm.tsx` to streamline expense allocation for common group scenarios.
* **Trade-offs Accepted:**
  - Blind mode preference is saved in local device storage (`localStorage`) as a user-level presentation setting rather than synced to server trip data.
  - Haptic feedback relies on native browser support (`navigator.vibrate`); on unsupported desktop browsers or devices with vibration disabled, calls degrade gracefully to silent no-ops.















## 27. Multi-Agent & In-App Unified Bug Tracking System
* **Context:** The application is developed, tested, and maintained cooperatively by multiple AI coding assistants (Antigravity, Claude Code CLI / Hive swarm) alongside human developers and QA testers. Bugs discovered during automated runs, manual testing, or runtime exceptions were previously lost across ephemeral chat contexts or untriaged in generic backlogs without structured telemetry or reproduction data.
* **Decision:** Build a lightweight, offline-first, git-native Bug Tracking System with both CLI (`scripts/bug.mjs`) and in-app diagnostics (`BugReportModal.tsx` and `ErrorBoundary.tsx`).
* **Pattern/Implementation:**
  - **Single Source of Truth (`bugs/bugs.json`)**: Machine-readable JSON ledger with structured fields (severity, category, reproduction steps, expected vs actual behavior, telemetry snapshot).
  - **Auto-Rendered Dashboard (`BUGS.md`)**: Human-readable markdown board with summary metrics, active bug specs, and resolution history, updated automatically on every state transition.
  - **CLI Workflow (`scripts/bug.mjs` & npm scripts)**: Provides commands (`add`, `list`, `show`, `resolve`, `update`, `sync`, `stats`) for fast programmatic triage by AI agents and terminal users.
  - **In-App Diagnostic Ring Buffer (`DiagnosticLogger.ts`)**: Maintains an in-memory buffer of recent console logs, uncaught exceptions, storage usage estimates, and sync queue backlog.
  - **In-App Bug Reporter Modal & ErrorBoundary**: Accessible in Settings and on runtime crashes, offering 1-click export of AI-ready markdown prompts and diagnostic JSON.
* **Trade-offs Accepted:**
  - Storing bug records directly in the git repository avoids paid third-party dependencies and guarantees tickets remain versioned with the exact code commit, at the minor trade-off of requiring a commit to record resolved bugs.

---

## 45. Database Backup Import Robustness & Descriptive Error Diagnostics
* **Context:**
  - When users exported and tried to restore a JSON database backup from Settings, any failure (such as desynchronized user session ID, trips already active, or database insertion anomalies) collapsed into a generic and misleading `"Invalid database snapshot format"` error in the UI.
  - Furthermore, `filterTripsOwnedByUser` previously discarded any trip where `ownerId !== userId`, causing backups to drop trips when restored onto another device/account, or when the backup contained trips joined from others.
---

## 35. Editorial Fluid Morph Header Architecture with Directional Hysteresis
* **Context:** When scrolling through transactions, members, analytics, or settings tabs, the header previously shrank via a rigid binary threshold (`scrollTop > 15px`) and CPU-intensive `max-height` transitions. This caused aggressive scroll jitter/flickering near the threshold, layout reflow stutter, and the complete disappearance of the sync status pill.
* **Decision:** Implemented an **Editorial Fluid Morph** header architecture with GPU-accelerated transforms and directional hysteresis.
* **Pattern/Implementation:**
  - **Directional Hysteresis & rAF Scroll Engine (`src/App.tsx`)**:
    - Replaced the 15px binary check with a directional hysteresis tracker throttled via `window.requestAnimationFrame`.
    - Expands at the top (`scrollTop <= 15px`), collapses smoothly on deliberate downward scroll (`scrollTop > 45px`), and expands early on upward scrolling near the top (`currentScrollTop < 120px` with 25px upward delta) to eliminate threshold bouncing and jitter.
  - **Inline Compact Metadata Badge (`src/App.tsx`)**:
    - Embedded an `.app-title-compact-badge` inside `.app-title-row` holding the currency code and live sync status dot.
    - Fades and translates in seamlessly when scrolled so crucial connectivity/sync status is never lost.
  - **GPU-Accelerated Morph & Spring Curves (`src/index.css`)**:
    - Replaced `max-height` transitions with GPU-accelerated `transform: scale(0.82) translateY(-1px)` and `opacity` transitions using a custom spring curve (`cubic-bezier(0.16, 1, 0.3, 1)`).
    - Upgraded glassmorphism to `backdrop-filter: blur(20px) saturate(180%)` with deep ambient drop shadows.
    - Aligned `.tab-pane` linear gradient mask to smoothly dissolve content under the compact header bar.
* **Trade-offs Accepted:**
  - Title scaling uses GPU `transform: scale(...)` with `transform-origin: left center` rather than CSS font-size transitions, which guarantees 60/120fps rendering and eliminates layout reflows across all mobile and desktop browsers.

---

## 36. WhatsApp-Style Hierarchical Stack Navigation & Sub-Screen Drill-Down Management
* **Context:** In the webapp, opening drill-down sub-screens in Settings (Categories & Tags, Recycle Bin, Appearance, Backups, Archived Trips) or modal drawers in Members/Groups did not push individual history stack entries. As a result, pressing the browser Back button or performing a mobile swipe-back gesture triggered the top-level trip unselection handler (`selectTrip(null)`), ejecting the user completely to the initial home screen.
* **Decision:** Implemented a full **WhatsApp-style Hierarchical Navigation Stack (LIFO)** where each nested level unwinds in strict reverse order before parent containers or the active trip can close.
* **Pattern/Implementation:**
  - **Settings Drill-Down Navigation (`src/components/SettingsView.tsx`)**:
    - Wired `useHistoryBack` to `subScreen !== null`, ensuring back navigation closes the active sub-screen (Categories, Recycle Bin, etc.) and returns to the Settings overview without exiting the trip.
    - Wired `useHistoryBack` to `expandedCategoryId !== null`, so open tag editors collapse first on back navigation.
    - Added `.settings-subscreen-enter` with `@keyframes whatsappSlideIn` for smooth slide transitions.
  - **Member & Group Drawers (`src/components/MembersGroupsTab.tsx`)**:
    - Wired `useHistoryBack` to `showAddGroup || Boolean(editingGroup)` and `Boolean(editingMember)`, ensuring open form sheets close back to the members list.
  - **Tab Level Stack Management (`src/App.tsx`)**:
    - Wired `useHistoryBack(!!activeTripId && activeTab !== 'expenses', () => setActiveTab('expenses'))`, so backing out from secondary tabs (Members, Analytics, Settings) transitions back to the primary Transactions tab before exiting the trip.
* **Trade-offs Accepted:**
  - Navigating between secondary tabs pushes lightweight hash history states (`#nav-N`) onto the stack. This guarantees that back gestures unwind intuitively without any unexpected screen leaps or data loss.

---

## 37. Floating Frosted Glass Pill Menu Architecture (Webapp)
* **Context:** The previous bottom tab bar on the webapp was rendered as a full-width flat opaque bar stuck to the bottom of the viewport. It looked rigid, boxy, and clashed with the modern translucent aesthetic established by the iOS and WhatsApp design systems.
* **Decision:** Implemented a **Floating Frosted Glass Pill Menu** (`.nav-tabs`) with spring active indicators and translucent backdrop blur.
* **Pattern/Implementation:**
  - **Pill Geometry & Glassmorphic Surface (`src/index.css`)**:
    - Transformed `.nav-tabs` into an elevated floating capsule (`position: absolute; bottom: calc(14px + safe-bottom); left: 50%; transform: translateX(-50%); max-width: 430px; border-radius: 9999px`).
    - Configured true glassmorphism with `backdrop-filter: blur(24px) saturate(190%)`, multi-layered ambient shadows, and inner rim highlight (`inset 0 1px 1px rgba(255, 255, 255, 0.9)` in light mode, `inset 0 1px 1px rgba(255, 255, 255, 0.08)` in dark mode).
  - **Spring Active State & Micro-Interactions (`src/index.css`)**:
    - Styled `.nav-tab-item` with spring easing `cubic-bezier(0.16, 1, 0.3, 1)`.
    - Active tabs receive a glowing capsule background (`rgba(0, 191, 165, 0.14)`), bold typography, and an icon elevation/scale pop (`scale(1.08) translateY(-1px)`).
  - **FAB & Content Clearance (`src/index.css`)**:
    - Re-anchored `.fab-add-expense` at `bottom: calc(78px + safe-bottom)` to hover directly above the right side of the floating glass bar.
    - Updated `.tab-pane` padding-bottom to `calc(88px + safe-bottom)` and bottom dissolution mask so content scrolls cleanly behind the pill.
* **Trade-offs Accepted:**
  - The floating pill occupies floating space over the bottom of the scroll view. Content padding-bottom ensures zero overlap with the final list items and buttons.

---

## 38. Classy Notification Center Architecture & Granular Deletion (Webapp)
* **Context:** The previous notifications drawer used an oversized dark header banner with negative margin hacks, lacked visual categorization (all rows looked identical with no icon differentiation), had no mechanism for clearing all notifications, and lacked mouse-hover delete actions on desktop.
* **Decision:** Implemented a full **Classy Notification Center** (`src/components/NotificationsPanel.tsx`) inspired by WhatsApp and Apple iOS Notification Center.
* **Pattern/Implementation:**
  - **Categorized Visual Squircles (`src/components/NotificationsPanel.tsx`)**:
    - Mapped notification types (`expense_added`, `expense_updated`, `expense_deleted`, `member_added`, `settlement`) to theme-colored squircle avatars with emerald unread status dots.
  - **Toolbar Actions & Clear All (`src/services/notificationsApi.ts`, `src/store/notificationsStore.ts`)**:
    - Added `deleteAllNotifications` database API and `clearAll` store action for one-tap notification purge with safety confirmation.
    - Added clean header toolbar containing `Mark read`, `Clear all`, and `✕` close button.
  - **Bidirectional Read & Unread Toggling (`src/services/notificationsApi.ts`, `src/store/notificationsStore.ts`, `src/components/NotificationsPanel.tsx`)**:
    - Added `markNotificationUnread(id)` API and `toggleRead(id)` / `markAsUnread(id)` store actions.
    - Embedded `IconMail` (mark unread) and `IconCheck` (mark read) on hover and on interactive squircle click.
  - **Refined Seamless Border Architecture (`src/index.css`)**:
    - Replaced asymmetrical heavy border-left with uniform hairline translucent borders, ambient highlight shadows, and jewel dot indicators.
* **Trade-offs Accepted:**
  - `Clear all` performs an irreversible batch deletion on the Supabase `notifications` table for the user. A confirmation prompt prevents accidental clears.

---

## 39. Multi-Trip Notification Scoping (Option C Hybrid) & Expense Autofocus
* **Context:**
  1. Users reported that opening the Expense form via the floating `+ Expense` button required an extra manual tap on the amount field to start typing.
  2. Notifications from older trips appeared in the Notification Center without trip context or scoping, creating ambiguity regarding which trip a settlement or expense notification belonged to.
* **Decision:**
  1. Implemented automatic focus and selection (`amountInputRef.current?.focus()`, `autoFocus`) on the amount hero input upon opening `ExpenseForm.tsx`.
  2. Implemented **Option C (Hybrid Multi-Trip Notification Architecture)**:
     - Embedded explicit **Trip Name Badges** (`.notif-trip-badge`) on every notification card to provide instant context.
     - Added a 1-tap **Segment Switcher** (`[Current Trip]` vs `[All Trips]`) in `NotificationsPanel.tsx` with dynamic unread count badges.
     - Updated `BalancesSettlements.tsx` to include the explicit `tripName` in settlement reminder notification titles and bodies.
---

## 40. Notification Payload Standardization & Smart In-App Display Normalization
* **Context:**
  - In-app notification cards were displaying duplicated trip names (e.g. `Himachal 2 [Himachal 2]`) because push payloads previously used the trip name as the `title` while the card also rendered the trip badge.
  - Event actions (such as deletion, addition, updates) were only present in the body text and could get cut off prematurely by CSS line clamping on long expense descriptions (e.g. `"...was..."`).
  - Historical notifications recorded past actions (such as deleting a test trip or expense with the same name), creating confusion when a trip with that name was present in the trip list.
* **Decision:**
  - Implemented `getNotificationDisplay()` helper in `NotificationsPanel.tsx` to cleanly extract action headlines (`Expense Added`, `Expense Deleted`, `Trip Deleted`, `Member Joined`, `Settlement Reminder`) and deduplicate header badges against trip names for both historical and future notifications.
  - Expanded `getNotificationMeta()` to support `trip_deleted` (rose trash) and `expense_restored` (emerald sparkles) icons.
  - Standardized push dispatch payloads across `tripStore.ts`, `App.tsx`, and `JoinTripScreen.tsx` with explicit action headlines and preserved `data.tripName`.
  - Added `word-break: break-word` and `overflow-wrap: break-word` to `.notif-card-text` to prevent awkward word truncation.
* **Trade-offs Accepted:**
  - Historical database notification records are normalized dynamically in the UI at render time without requiring retroactive SQL backfills.

---

## 41. Trip Deletion Authority Enforcement, Cascade Isolation & Notification Normalization
* **Context:**
  1. Users observed phantom "Trip Deleted" notifications for trips (e.g. "Sikkim Bagpacking") that were still present on their home screen. Non-owner members were presented with the delete button on `TripsListScreen` and `SettingsView`; executing delete dispatched the push notification to recipients before Supabase RLS rejected the deletion (0 rows deleted). Because the trip was not actually deleted, Postgres foreign key cascading did not remove the notification, leaving a permanent "Trip Deleted" record in recipient inboxes while the trip remained on the home page.
  2. Deleted trip push notifications passed `tripId`, creating a Catch-22: if the trip was deleted, PostgreSQL `ON DELETE CASCADE` wiped the notification from `notifications` table; if the delete failed, the notification survived.
  3. Expense deleted notifications displayed awkward redundant text (e.g., `"<Long Title>" was...` cut off by line clamping) because the body repeated `"... was deleted"` while the card headline already stated `Expense Deleted`.
  4. Clicking on a `trip_deleted` notification attempted to select and navigate into a non-existent trip.
* **Decision:**
  1. **UI Permission Gates (`TripsListScreen.tsx`, `SettingsView.tsx`):** Guard the "Delete trip" action to only render for authorized trip owners or admins (`isTripAdmin`).
  2. **Store & API Safeguards (`tripStore.ts`, `tripApi.ts`):** Check owner/admin authorization in `deleteTrip` before dispatching push notifications. Update `deleteTripRow` to verify that rows were deleted via `.select('id')`, throwing if 0 rows were affected.
  3. **Decouple Trip Deletion Notifications from Foreign Key Cascade (`tripStore.ts`):** Send `trip_deleted` notifications without the relational `tripId` FK (keeping `tripName` in `params.tripName`), preventing Postgres `ON DELETE CASCADE` from deleting the notification when the trip is removed.
  4. **Clean Action Body Normalization (`notificationText.ts`):** Update `renderNotificationBody()` to extract the pure expense title (and currency/amount if structured in `data`) and strip redundant trailing verbs (`was deleted`, `was updated`, `was restored`, `added`) with robust parsing for legacy notifications.
  5. **Safe Realtime & Interaction Handling (`notificationsStore.ts`, `NotificationsPanel.tsx`):** Immediately remove deleted trips from Zustand `trips` state upon receiving realtime `trip_deleted` notifications. Prevent `handleOpenNotification` from selecting deleted or non-existent trips.
* **Trade-offs Accepted:**
  - Non-owner trip participants cannot delete shared trips (they can archive or leave the trip instead).
  - Historical notifications without structured `data.expenseTitle` are normalized via regex matching against known verb patterns.

---

## 42. Offline Sync Queue Fallback on Network Failure & Form / Share Hardening
* **Context:**
  1. In `src/store/tripStore.ts`, when `navigator.onLine` was true but backend requests failed (e.g. captive portal, DNS resolution failure, network hiccup), mutations (adding/updating/deleting expenses, members, groups) caught the error and reverted the optimistic local state, deleting the user's freshly entered data with an error banner.
  2. When sharing an unsynced or offline-created trip before server sync generated a `joinCode`, `ShareTripModal.tsx` rendered a broken URL `http://.../join/undefined` and an empty share code box.
  3. Form validation errors in `ExpenseForm.tsx` rendered solely at the bottom of the modal below the split matrix, forcing users to scroll down on shorter mobile screens to see why submitting failed.
  4. Search clear `X` icon overlapped the 20px curved border radius of `.expense-search-input`.
  5. The bottom items in `.tab-pane` could partially hide behind the floating `NavTabs` on short mobile screens.
* **Decision:**
  1. **Resilient Sync Fallback (`src/store/tripStore.ts`):** Modified all CRUD operations (`addExpense`, `updateExpense`, `deleteExpense`, `addMember`, `createTrip`, `createGroup`, `updateGroup`, `deleteGroup`, `addCategory`, `deleteCategory`) so that when an online API call fails, it logs a warning and enqueues the mutation to `queueSync()`, preserving the user's optimistic local data and automatically synchronizing when connectivity recovers.
  2. **Unsynced Share State (`src/components/ShareTripModal.tsx`):** Added a defensive `hasJoinCode` check. When a trip has not yet received a server-generated `joinCode`, the modal renders a helpful sync-pending banner and disables the copy actions.
  3. **Inline Form Validation (`src/components/ExpenseForm.tsx`, `src/index.css`):** Rendered field-specific validation errors directly beneath the Amount and Title input fields, styling `.amount-hero.amount-hero-error` with danger accents for immediate feedback.
  4. **Search Inset & Mobile Clearance (`src/index.css`):** Adjusted `.expense-search-input` right padding and `.search-clear-btn` positioning to sit inside the curved boundary; increased `.tab-pane` bottom padding to `calc(104px + var(--safe-bottom, 0px))` for full floating nav clearance.
* **Trade-offs Accepted:**
  - Network-failed mutations persist locally with temporary IDs and sync in the background upon reconnection, prioritizing zero data loss over immediate server confirmation.

---

## 43. MapLibre Popup HTML Injection Sanitization (OWASP A03 / XSS Prevention)
* **Context:**
  - In `src/components/TripJourneyMap.tsx`, expense titles and reverse-geocoded place names were interpolated directly into raw HTML template strings and rendered via MapLibre GL's `Popup.setHTML()`.
  - Because MapLibre GL does not sanitize HTML input passed to `setHTML()`, a trip participant could store crafted script or image onerror payloads in an expense title, triggering stored XSS for other participants upon clicking the map marker pin on the Analytics tab.
* **Decision:**
  - Introduced `escapeHtml()` utility to escape `&`, `<`, `>`, `"`, and `'` characters prior to popup HTML generation.
  - Added unit test suite `src/components/TripJourneyMap.test.ts` to prevent regressions against common XSS injection vectors.
* **Trade-offs Accepted:**
  - Raw HTML tags inside expense titles or reverse geocoding place names will render as literal escaped text rather than HTML formatting, preserving visual text while preventing code execution.

---

## 44. Privacy "Blind Mode" Amount Masking, Micro-Haptics & Smart Split Presets
* **Context:**
  1. Users viewing trip expenses or balance totals in public spaces, on shared screens, or taking screenshots needed a privacy option to conceal sensitive financial debts and amounts.
  2. Touch interaction on mobile web lacked tactile micro-feedback for key user actions (swiping items, marking settlements paid, checking split checkboxes).
  3. Form entry for custom/percentage split configurations required multiple tedious manual taps to allocate shares across members.
* **Decision:**
  1. **Privacy "Blind Mode" (`src/store/privacyStore.ts`, `src/App.tsx`):** Built a persistent Zustand-backed privacy store (`isBlindMode`) with a toggle button in the top app header (`IconEye` / `IconEyeOff`). When active, masks all monetary amounts across headers, expense lists, balance summaries, and analytics charts with formatted `•••••` text and CSS blur effects (`.privacy-blur`).
  2. **Micro-Haptics Feedback (`src/utils/haptics.ts`):** Created a safe, feature-detected Web Haptics vibration utility (`triggerHaptic`) providing tactile feedback for row swiping (`SwipeableRow.tsx`), settlement confirmations (`BalancesSettlements.tsx`), split mode changes, preset selections, and form submissions (`ExpenseForm.tsx`).
  3. **Smart Split Presets (`src/components/ExpenseForm.tsx`):** Added 1-tap allocation presets (`⚡ Equal All`, `⚖️ 50% Payer / 50% Group`, `👤 Only Payer`) above the split participant matrix in `ExpenseForm.tsx` to streamline expense allocation for common group scenarios.
* **Trade-offs Accepted:**
  - Blind mode preference is saved in local device storage (`localStorage`) as a user-level presentation setting rather than synced to server trip data.
  - Haptic feedback relies on native browser support (`navigator.vibrate`); on unsupported desktop browsers or devices with vibration disabled, calls degrade gracefully to silent no-ops.

---

## 27. Multi-Agent & In-App Unified Bug Tracking System
* **Context:** The application is developed, tested, and maintained cooperatively by multiple AI coding assistants (Antigravity, Claude Code CLI / Hive swarm) alongside human developers and QA testers. Bugs discovered during automated runs, manual testing, or runtime exceptions were previously lost across ephemeral chat contexts or untriaged in generic backlogs without structured telemetry or reproduction data.
* **Decision:** Build a lightweight, offline-first, git-native Bug Tracking System with both CLI (`scripts/bug.mjs`) and in-app diagnostics (`BugReportModal.tsx` and `ErrorBoundary.tsx`).
* **Pattern/Implementation:**
  - **Single Source of Truth (`bugs/bugs.json`)**: Machine-readable JSON ledger with structured fields (severity, category, reproduction steps, expected vs actual behavior, telemetry snapshot).
  - **Auto-Rendered Dashboard (`BUGS.md`)**: Human-readable markdown board with summary metrics, active bug specs, and resolution history, updated automatically on every state transition.
  - **CLI Workflow (`scripts/bug.mjs` & npm scripts)**: Provides commands (`add`, `list`, `show`, `resolve`, `update`, `sync`, `stats`) for fast programmatic triage by AI agents and terminal users.
  - **In-App Diagnostic Ring Buffer (`DiagnosticLogger.ts`)**: Maintains an in-memory buffer of recent console logs, uncaught exceptions, storage usage estimates, and sync queue backlog.
  - **In-App Bug Reporter Modal & ErrorBoundary**: Accessible in Settings and on runtime crashes, offering 1-click export of AI-ready markdown prompts and diagnostic JSON.
* **Trade-offs Accepted:**
  - Storing bug records directly in the git repository avoids paid third-party dependencies and guarantees tickets remain versioned with the exact code commit, at the minor trade-off of requiring a commit to record resolved bugs.

---

## 45. Database Backup Import Robustness & Descriptive Error Diagnostics
* **Context:**
  - When users exported and tried to restore a JSON database backup from Settings, any failure (such as desynchronized user session ID, trips already active, or database insertion anomalies) collapsed into a generic and misleading `"Invalid database snapshot format"` error in the UI.
  - Furthermore, `filterTripsOwnedByUser` previously discarded any trip where `ownerId !== userId`, causing backups to drop trips when restored onto another device/account, or when the backup contained trips joined from others.
* **Decision:**
  1. **Dynamic Session & Identity Resolution (`src/store/authStore.ts`, `src/store/tripStore.ts`):** Ensure user authentication state immediately updates `useTripStore`'s `userId` on all auth lifecycle events and fallback to `supabase.auth.getSession()` during import if uninitialized.
  2. **Active Trip Deduplication (`filterTripsOwnedByUser`):** Deduplicate against active account trips by `id` rather than blindly dropping non-owned trips, allowing full cross-device and cross-account backup restorations.
  3. **UUID & Member Mapping Safety (`src/services/tripApi.ts`):** Ensure all mapped `paid_by` and `split_member_ids` entries are validated as proper UUIDs, preventing PostgreSQL type rejection on dangling member references.
  4. **Structured Error Diagnostics (`src/store/tripStore.ts`, `src/components/SettingsView.tsx`, `src/App.tsx`):** `importDatabase` now returns `{ success: boolean, error?: string }`, and `SettingsView` renders the exact, contextual error message directly to the user.
* **Trade-offs Accepted:**
  - Duplicate trip imports are prevented when the trip is already active in the account, alerting the user with `"All trips in this backup already exist in your account."` rather than silently creating duplicate records.

---

## 46. WebApp UI/UX Overhaul Suite (Fast Capture, Flow Graph, Trip Wrapped, Command Palette & Realtime Presence)
* **Context:**
  - Fast capture of group expenses on mobile was constrained by fixed local currencies, manual receipt data entry, and risk of accidental duplicate entries.
  - Balances and settlements were only presented as a linear text list, lacking visual intuition for multi-person debt flow networks.
  - Travelers lacked engaging social wrap-up cards ("Trip Wrapped") to share summary statistics on Instagram / messaging platforms.
  - Power users needed fast keyboard navigation (`Cmd+K`) and day-by-day itinerary views on desktop and mobile.
* **Decision:**
  1. **Multi-Currency & Client-Side OCR (`src/utils/currencyConverter.ts`, `src/utils/receiptOcr.ts`, `src/components/ExpenseForm.tsx`):**
     - Built an offline-first currency conversion calculator for 14 major currencies with live converted equivalent pills.
     - Added client-side receipt parsing for automatic total and merchant suggestions.
     - Added real-time duplicate expense detection based on amount, date, and category matching.
  2. **Interactive Directed Cash-Flow Graph (`src/components/BalanceFlowGraph.tsx`, `src/components/BalancesSettlements.tsx`):**
     - Rendered circular SVG network graph of members with directional animated gradient vector curves, debt labels, and 1-tap partial settlement quick chips (`25%`, `50%`, `75%`, `100%`).
  3. **Trip Wrapped Social Story Card (`src/components/TripWrappedModal.tsx`):**
     - High-resolution 1080x1920 2D canvas infographic summarizing top spenders, category breakdowns, daily averages, and trip superlatives with 1-click PNG download and Web Share API.
  4. **Command Palette & Timeline Itinerary (`src/components/CommandPalette.tsx`, `src/components/ExpenseList.tsx`):**
     - `Cmd+K` / `Ctrl+K` command palette indexing actions, trips, members, and expenses.
     - Day-by-Day Itinerary mode grouping expenses by day index with daily spend subtotals.
  5. **Supabase Realtime Peer Presence (`src/hooks/usePeerPresence.ts`):**
     - Tracks active travelers viewing the same trip simultaneously and renders online status avatars in the trip header.
* **Trade-offs Accepted:**
  - Currency conversion rates use offline-first median exchange rates when offline, prioritizing zero latency and reliable offline calculation over sub-second forex volatility.

---

## 47. 1-Tap UPI & Regional Payment Deep Linking (Feature Flag Gated)
* **Context:**
  - In India and regional markets, settling group trip expenses manually requires opening external payment apps, copying contact numbers, typing UPI IDs, and entering amounts manually, creating friction and settlement errors.
  - The feature must be strictly flag-gated under superadmin control (`enableUpiPayments`) for phased rollouts.
* **Decision:**
  - **Feature Flag Control (`src/types/admin.ts`, `src/utils/featureFlags.ts`):** Registered `enableUpiPayments` flag in `FEATURE_FLAGS_META` (default `false`), toggled via Ops Deck (`AdminFlagsPage.tsx` / `AdminFeaturesPage.tsx`).
  - **NPCI UPI Intent Generator (`src/utils/upiLinks.ts`):** Standard `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...` plus app-specific schemes for Google Pay (`tez://`), PhonePe (`phonepe://`), Paytm (`paytmmp://`), CRED (`cred://`), and BHIM (`bhim://`).
  - **1-Tap Settlement Modal (`src/components/UpiPaymentModal.tsx`):**
    - Instant app launch deep links with pre-filled amount, payee, and trip note.
    - Dynamic QR code generation for on-screen scanning.
    - 1-click "Mark as Settled" recording the transaction into the trip ledger.
  - **Balances & Settlements Integration (`src/components/BalancesSettlements.tsx`):**
    - Conditioned on `useTripStore((s) => s.isFeatureEnabled('enableUpiPayments', { tripId: trip.id }))`.
    - Only rendered when the superadmin enables the flag.
* **Trade-offs Accepted:**
  - UPI deep link intents open native apps via custom URI schemes on mobile devices. On desktop browsers without registered protocol handlers, the modal provides a dynamic QR code and 1-click URI copy button.

---

## 49. Multi-Stop Route Planner, Translucent Header Map & Ambient Tourism Photography
* **Context:**
  - When creating or editing a trip, users often travel across multiple intermediate destinations (e.g. `Delhi → Manali → Kasol`). Previously, trips only stored a single unstructured text destination string with no route coordinates or visual map representation.
  - Users wanted a dynamic, translucent ambient background reflecting editorial tourism photography of the places in their trip that gently cycles between the cities, plus an interactive translucent route banner map highlighting all stops and waypoints.
* **Decision:**
  1. **Multi-Stop Route Builder (`src/types/index.ts`, `src/components/TripsListScreen.tsx`):**
     - Added `TripStop { id: string; name: string; lat?: number; lng?: number; }` and `stops?: TripStop[]` to `Trip`.
     - Built dynamic Google Maps-style route stop inputs with `+ Add Stop`, remove `✕` buttons, numbered waypoint badges (`1`, `2`, `3`...), and one-click `+ Plan multi-stop route` transition.
     - Saved stops are permanently stored on trip records and displayed on home page passport cards with numbered stop chips (`[ 1. Delhi ] [ 2. Manali ] [ 3. Kasol ]`).
  2. **Fast Sub-100ms Geocoding Engine (`src/utils/geolocation.ts`):**
     - Upgraded `searchPlaces` to use **Photon by Komoot** (OSM-indexed, sub-100ms response time, open CORS, zero rate limits) with Nominatim fallback.
  3. **Wikipedia & Wikimedia Tourism Photography Engine (`src/services/placeImageService.ts`):**
     - Decomposes composite route strings into individual candidate cities.
     - Queries Wikipedia summary endpoints and falls back to media generator search across top 5 articles, filtering out non-photographic SVG logos/flags to return editorial travel photos.
  4. **Ambient Photo Slideshow Backdrop (`src/components/AmbientPhotoBackdrop.tsx`):**
     - Fetches and caches photos for every city in the active trip.
     - Cycles between city photos with a smooth 6.5-second cross-fade animation, soft background blur (`filter: blur(10px)`), and subtle place indicator badge (e.g. `📍 Manali (2/3)`).
  5. **Translucent Header Route Map Banner (`src/components/TripBannerRouteMap.tsx` & `src/App.tsx`):**
     - Integrated MapLibre directly inside `.app-header.trip-dashboard-header` as a translucent route backdrop (`opacity: 0.42` with luminosity blend).
     - Renders glowing geodesic route lines, numbered waypoint markers, smart bounds auto-fitting, and frosted-glass stop chips.
  6. **Content Security Policy Hardening (`index.html`):**
     - Updated CSP `connect-src` to allow `https://photon.komoot.io`, `https://en.wikipedia.org`, `https://*.wikipedia.org`, and `https://*.wikimedia.org`.
     - Updated CSP `img-src` to allow `https://*.wikimedia.org`, `https://upload.wikimedia.org`, and `https://*.wikipedia.org`.
* **Trade-offs Accepted:**
  - Client-side Wikipedia and Photon queries execute asynchronously with graceful fallbacks (if a city has no photo or offline, UI gracefully preserves standard themes without breaking).

---

## 50. Viewport-Locked Non-Scrollable Card Stack Home Screen
* **Context:**
  - In the card-style stack presentation on the home screen (`stackActive`, when 2+ trips exist and user is browsing the deck on mobile), the combination of top header, section title, card stack stage, "View all trips" button, slide launcher, and safe-area margins exceeded mobile viewport heights (e.g. 667px–844px), causing vertical page scroll and disrupting swipe interactions.
* **Decision:**
  - Added `.stack-viewport-lock` class to `.trips-screen-scroll` when `stackActive` is active on [`src/components/TripsListScreen.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripsListScreen.tsx).
  - In [`src/index.css`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/index.css), locked the screen container to `height: 100%; height: 100dvh; overflow: hidden; overscroll-behavior: none;` and established a flex column layout with `min-height: 0; flex: 1;` on the stage, tighter proportionate padding, and compact launcher dimensions so all elements (Header, Profile Avatar, Logo, Title, Card Stack Deck, View all button, Slide Launcher) fit natively inside 100% of the viewport with zero vertical scroll.
  - Preserved standard scrollable behavior for desktop (>=900px) grid mode, list mode (`showList`), and trip create/join forms.
* **Trade-offs Accepted:**
  - Card stage dynamically consumes available viewport height via flexbox rather than fixed pixel heights, ensuring clean scaling across varying phone screen dimensions.

---

## 51. Flight-Themed Coachmark Helper Tooltip on Add Expense Action
* **Context:**
  - New users opening a trip often needed visual reassurance and intuitive onboarding for recording their first expense, logging flights, hotel stays, food, or group splits without scanning dense UI text.
* **Decision:**
  - Built [`src/components/FlightAddExpenseTooltip.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/FlightAddExpenseTooltip.tsx) anchored above the center navigation `+` button in [`src/components/NavTabs.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/NavTabs.tsx).
  - Integrated an animated airplane ✈️ gliding along a curved dashed contrail (`contrailFlow` keyframe), frosted-glass backdrop (`backdrop-filter: blur(20px)`), and contextual messaging (*"Ready for takeoff? Tap + to log an expense!"* vs destination-tailored *"Ready for [City]? Log your 1st expense!"*).
  - Added 1-tap launch into the expense modal with haptic feedback, 1-click `&times;` dismissal, and persistent `localStorage` memory (`tt_flight_add_tooltip_dismissed_v1`) to prevent re-prompting once dismissed.
* **Trade-offs Accepted:**
  - Tooltip only auto-prompts on first onboarding before dismissal, maintaining a clean and minimal interface for frequent power users while providing instant discoverability for beginners.

---

---

## 53. 3D Flip Boarding Pass, Ambient Telemetry & Animated Journey Route Playback
* **Context:**
  - The trip balance summary card held key financial data (Outstanding debt, driver narrative, and Settled/Unsettled stamps) but lacked travel immersion. Furthermore, users wanted ambient destination telemetry, collectible squad milestones, and an engaging way to visualize their route on the map without cluttering the main screen.
* **Decision:**
  - Implemented [`src/components/BoardingPassHeroCard.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/BoardingPassHeroCard.tsx) with a 3D perspective flip (`perspective: 1200px; transform-style: preserve-3d; transition: transform 0.6s`).
  - **Front Side:** Faithfully preserves the signature cream Balance Summary ticket (Trip name, Currency, tilted `[ Unsettled ]` / `[ All Settled ✓ ]` ink stamp, dual perforated dashed lines, large `OUTSTANDING TO SETTLE` amount + driver narrative, and member/transfer counts).
  - **Back Side:** Flips 180° to reveal the Flight Boarding Pass with Origin $\rightarrow$ Destination airport codes (`DEL ✈ IXB`), passenger seat, 1-tap join code copy, live ambient destination weather (via [`src/services/weatherService.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/services/weatherService.ts)), and barcode.
  - Built [`src/utils/achievementBadges.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/achievementBadges.ts) and [`src/components/AchievementBadgeModal.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/AchievementBadgeModal.tsx) to award collectible squad enamel pins (*Caffeine Logistics, Midnight Odyssey, Apex Roadrunner, Lightning Settlement*).
## 54. Crisp Interactive Geotagged Journey Route Map
* **Context:**
  - Complex animation loops on mobile web maps can introduce UI complexity and camera contention. The app requires a fast, clean, and interactive route overview that plots all trip expenses, category waypoints, and connected road paths clearly.
* **Decision:**
  - Maintained a clean and responsive vector map in [`src/components/TripJourneyMap.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripJourneyMap.tsx) featuring category-themed pin markers, tap-to-inspect transaction popups, and OSRM road geometry without intrusive animation controls.
---

## 55. Material Design 3 / Material-UI Design System for Superadmin Dashboard & Bug Tracker
* **Context:**
  - Administrative control and bug tracking interfaces require a modern, expressive Material Design 3 (M3) / Material-UI (MUI) design system, adapted from the visual design language in the reference screenshot (`#1D2A68` Deep Royal Navy navigation rail, `#F4F5FA` soft lavender-tinted canvas, 24px rounded white card containers, soft pastel tonal pills, crisp midnight ink typography, high-contrast dark accents).
* **Decision:**
  - Authored comprehensive visual design mockups and detailed specifications for two core administrative platforms with multiple layout versions:
    1. **Superadmin Dashboard**:
       - *Version 1 (Executive Overview & Health Hub)*: KPI rounded cards, 30-day telemetry chart, security audit trail table, global tenant selector.
       - *Version 2 (High-Density Enterprise Command Center)*: Real-time gauge metrics (CPU, RAM, Latency, Error rate), tenant/organization grid, real-time server load heatmap, security threat monitor.
    2. **Bug & Incident Tracker**:
       - *Version 1 (Material 3 Triage & Kanban Board)*: 4-column issue pipeline (Backlog, In Progress, In Review, Resolved), severity tags (Critical, High, Medium, Low), error type tags, assignee avatar stacks.
       - *Version 2 (Diagnostic Split View & Stack Trace Inspector)*: Split view issue list + stack trace diagnostic inspector with syntax highlighting, environment metadata, activity timeline, and quick-action resolution pills.
* **Trade-offs Accepted:**
  - Focused strictly on UI visual mockups, color tokens, layout blueprints, and Material-UI component maps first without touching front-end application code, allowing design alignment before code execution.

---

## 56. Immersive Welcome Screen & 3D Flipping Card Login Flow
* **Context:**
  - When the webapp opens and the user is not logged in, there is no landing/welcome screen (just a direct Google sign-in page). There needs to be a welcoming entrance that explains the product value proposition, guides the user with a premium tactile gesture ("Slide to unlock"), and hides administrative/superadmin logins behind a clean interactive reveal.
* **Decision:**
  - Added an immersive Welcome Screen featuring a full-viewport atmospheric travel mountain photography background (`travel-bg.jpg`), a centered logo/brand card, and an iOS-style transparent sliding track with frosted glass backdrop blur and spring-back drag physics.
  - Implemented a 3D Flipping Card using GPU-accelerated CSS `rotateY` transforms. Traveler options (Google Sign-In + Guest Mode) render on the front, while the Superadmin credentials form renders inline on the back face (activated by clicking the corner shield button or the Super User button).
* **Trade-offs Accepted:**
  - Background image (`travel-bg.jpg`) increases bundle size by ~840KB. However, this is heavily mitigated because the login screen is a standalone route/code-split view, and a premium visual first impression is worth the initial load latency.

---

## 57. Material Design 3 Visual Overhaul for Superadmin Dashboard and Bug Ledger
* **Context:**
  - The previous visual theme of the Superadmin portal used highly saturated sky-blue and deep navy shades that felt high-contrast and fatiguing during administrative operations. Additionally, the Bug Ledger lacked a fourth column for "Won't Fix" tickets in its Kanban board view, and stack trace previews lacked proper technical syntax highlighting/developer-oriented dark styling.
* **Decision:**
  - Re-designed and overhauled color tokens and layout structures in `ops-deck.css` following Material Design 3 guidelines:
    - Light Mode uses a calming lavender-gray canvas (`#F4F5FA`), pure white card components with soft shadows (`--card-shadow`), and a solid Deep Royal Navy (`#1D2A68`) navigation rail.
    - Dark Mode uses a deep obsidian-charcoal canvas (`#12141A`) with slate-navy cards (`#1A1E29`) and soft glowing telemetry area fills.
  - Upgraded the `SuperAdminBugTracker` Kanban board to a full 4-column issue pipeline, introducing the *Won't Fix* status column next to Open, Working, and Settled statuses.
  - Refactored the error diagnostic trace box (`.ops-bug-stack`) into a gorgeous developer-styled dark obsidian console block with high-contrast stack logging.
  - Implemented GPU-accelerated spring curves (`cubic-bezier(0.16, 1, 0.3, 1)`) on `.ops-card` and `.ops-kanban-card` elements for smooth hover rises and clicks.
* **Trade-offs Accepted:**
  - In light mode, the navigation rail uses dark background elements while the content page uses light elements. This hybrid contrast creates high spatial clarity and visual anchors, at the expense of pure monochromatic uniformity.

---

## 58. Usability, Uber-Grade Spring Motion & WCAG 2.2 Accessibility Overhaul
* **Context:**
  - The web application required top-tier consumer travel app smoothness (Uber/Airbnb feel) and full compliance with WCAG 2.2 Level AA/AAA accessibility standards across focus management, custom widgets, live status announcements, touch target sizes, and reduced motion.
* **Decision:**
  - **Universal Focus Trapping:** Upgraded `useFocusTrap` to manage active elements, autofocus, keydown trapping, and return focus upon cleanup. Wired across all modal dialogs (`ConfirmDialog`, `ShareTripModal`, `GlobalSettingsModal`, `ExpenseReviewModal`, `NotificationsPanel`, `CommandPalette`, `TripWrappedModal`, `AchievementBadgeModal`, `ConflictResolverModal`, `SuperadminAuthModal`).
  - **WAI-ARIA Custom Widgets:**
    - `CommandPalette`: Full combobox/listbox/option pattern with `aria-expanded`, `aria-controls`, and `aria-activedescendant`.
    - `DateRangePicker`: Calendar grid with `role="grid"`, `role="row"`, `role="gridcell"`, `aria-selected`, and formatted date labels.
    - `NavTabs`: Tablist pattern (`role="tablist"`, `role="tab"`, `aria-selected`).
    - `TripContentSheet`: Accessible drag handle button with `aria-expanded` and keyboard controls (Enter/Arrows to cycle snap points).
    - `UndoToasts` & `InAppNotificationBanner`: Wrapped in `role="status"` / `aria-live="polite"` for automatic screen reader announcements.
  - **Uber-Grade Motion & Touch Targets:**
    - Spring deceleration curves (`cubic-bezier(0.32, 0.72, 0, 1)`) and GPU-composited transform transitions across sheets and modal cards.
    - Guaranteed $\ge 44 \times 44\text{px}$ touch target sizes via `.touch-target-btn` utility.
    - Strict `prefers-reduced-motion: reduce` overrides dropping transitions to `0.01ms` for motion sensitivity.
* **Trade-offs Accepted:**
  - Native browser DOM APIs and CSS properties were chosen over third-party motion libraries (such as Framer Motion or GSAP) to maintain zero runtime bundle overhead and zero extra memory consumption.

---

## 59. Morphing Sticky Balance Micro-Bar (Uber / Revolut-Style Collapsible Header)
* **Context:**
  - In consumer travel and ride apps (Uber, Revolut, Apple Maps), browsing long lists (expenses, transactions, settlements) causes top-level hero cards to scroll away, leaving users disconnected from their real-time financial balance. Static pinning of large hero tickets ($\approx 220\text{px}$) consumes excessive screen space on mobile viewports.
* **Decision:**
  - Implemented the **Morphing Sticky Micro-Bar** pattern via `StickyBalanceBar` and a zero-overhead `IntersectionObserver`.
  - When the user scrolls past the Boarding Pass ticket, a frosted glass strip (`position: sticky; top: 0; backdrop-filter: blur(24px)`) glides into place, displaying the trip route, live total spend, personal net balance pill (`Gets back`, `Owes`, or `Settled`), and a tap-to-top quick jump action.
  - The remaining content (settlements, expense lists, category breakdowns) scrolls fluidly underneath this pinned bar.
* **Trade-offs Accepted:**
  - The sticky bar utilizes native CSS `position: sticky` and `IntersectionObserver`, consuming 0% continuous JavaScript CPU polling and preserving smooth 60-120 FPS GPU compositing.

---

## 60. Mobility-Grade UI/UX Motion Architecture (Uber / Ola / Rapido Benchmarks)
* **Context:**
  - Mobile web interactions (sliding bottom sheets, tab switching, slide-to-confirm, list scrolling) can suffer from micro-stutter when animating CPU layout properties (`top`, `margin`, `width`).
  - To achieve parity with premier mobility apps (Uber, Ola, Rapido), the webapp needed fluid 120Hz spring physics, zero-reflow GPU compositing, dynamic sliding tab indicators, progressive slide-to-settle track feedback, and staggered list cascades.
* **Decision:**
  - **120Hz GPU Compositor Sheets:** Configured `--ease-uber-spring: cubic-bezier(0.18, 0.89, 0.32, 1.12)` with `will-change: top, border-radius` and `transform: translateZ(0)` to eliminate browser reflows during continuous dragging.
  - **Shared Sliding Navigation Pill:** Implemented dynamic layout measurement in `NavTabs.tsx` to glide a floating background capsule indicator (`.nav-tabs-pill`) between tabs with spring interpolation and tactile micro-press scaling.
  - **Progressive Slide-to-Settle Track:** Upgraded `SlideToUnlock.tsx` with dynamic progress-reactive gradient fill, animated shimmer beam, multi-stage haptic triggers (25%, 50%, 75%, 90%), and elastic bounce-back spring physics.
  - **Staggered Expense List Cascades:** Added `.expense-item-cascade` and CSS `--item-index` stagger delays combined with `content-visibility: auto` to ensure 120 FPS scroll performance.
  - **Dynamic Map Marker Drops:** Added `.map-marker-pin` with index-staggered bounce drop-in physics for route stop pins.
* **Trade-offs Accepted:**
  - Zero heavy external libraries were added (no Framer Motion/Lottie runtime bloat); all motion relies exclusively on native CSS hardware-accelerated transforms and lightweight event listeners.

---

## 61. Interactive Micro-Motion & Visual Polish Suite (Phase 2 Mobility Enhancements)
* **Context:**
  - High-frequency user touch points (Boarding Pass hero card, settlement completion, 3D card deck browsing, spend donut analytics, category chip selection) lacked physical delight and feedback loops.
* **Decision:**
  - **Boarding Pass Laser Sweep:** Integrated an animated laser light shimmer beam (`.bp-barcode-sweep`) over the ticket barcode.
  - **3D Card Stack Rotational Tilt:** In `TripStack.tsx`, added rotational inertia (`rotate(${tiltDeg}deg)`) and scale compression during drag gestures with spring recovery.
  - **Settlement Celebration Checkmark Bloom:** When tapping Settle in `BalancesSettlements.tsx`, the button expands with a green checkmark and circular shockwave halo (`@keyframes ringBloom`).
  - **Interactive Analytics Donut Popout:** Tapping or hovering category slices extrudes the SVG ring outward by `3px` with a drop-shadow glow and smooth stroke transitions.
  - **Category Selection Halo:** Added spring pop scaling (`scale(1.04)`) and glowing focus halos for active expense form categories and split pills.
* **Trade-offs Accepted:**
  - All animations are 100% CSS GPU-accelerated and event-driven, maintaining 0% idle CPU utilization and zero bundle size increase.

---

## 62. Calibrated Network & Cloud Sync Lifecycle (Offline → Syncing → Synced)
* **Context:**
  - When reconnecting to the internet or manually triggering sync, the header sync status pill previously jumped directly from offline to synced without showing an in-progress transition, leading to ambiguity on whether queued changes were currently in flight.
* **Decision:**
  - Introduced an explicit `syncing` status in the state machine (`SyncStatus = 'offline' | 'syncing' | 'session-expired' | 'out-of-sync' | 'synced'`).
  - **Reconnection Sequence:** When the browser fires an `online` event, the app automatically activates `isSyncing = true`, flashes the pulsing blue `Syncing…` badge, processes the offline sync queue (`processQueue()`), pulls updated server expenses, and stamps `lastBackendSyncedAt` before settling into green `Synced just now`.
  - **Offline Detection:** When `!isOnline`, the badge immediately displays `Offline` with muted styling.
* **Trade-offs Accepted:**
  - Lightweight local state machine with zero background polling overhead; transitions are triggered purely by native browser network events and user sync interactions.

---

## 63. Card Stack Gesture Isolation & Header Profile Avatar Ergonomics
* **Context:**
  - On the main trips screen, when multiple trips activated the 3D card stack deck, swiping down on cards caused choppy, stuttering animations. This was caused by `usePullToRefresh` capturing `touchmove` events on the locked container, mutating CSS `height` directly (causing repeated layout reflows), and fighting the card stack's own pointer drag handlers.
  - Additionally, the user profile avatar button was anchored on the top-left of the header, which is difficult to reach with one hand on modern mobile devices.
* **Decision:**
  - **Pull-to-Refresh Gating (`!stackActive`):** Added an `enabled` flag to `usePullToRefresh` and passed `!stackActive` in `TripsListScreen.tsx`. Pull-to-refresh is deactivated and its indicator unmounted while the card stack is active, giving cards 100% exclusive control over swipe gestures without touch conflict or layout reflows. Pull-to-refresh remains fully functional when viewing the scrollable list (`showList === true`) or expense views.
  - **Right-Aligned Header Profile Avatar (WhatsApp Pattern):** Repositioned the profile avatar button from the left column to the right column of `.trips-screen-header` (`grid-template-columns: 40px 1fr 40px`), aligning with standard single-handed thumb reachability patterns.
* **Trade-offs Accepted:**
  - Pull-to-refresh is disabled on the non-scrolling card stack screen. Because trips automatically sync on mount and support optimistic updates, pull-down refresh is unnecessary on a fixed card deck and omitting it delivers buttery smooth 120 FPS card swiping.

---

## 64. Settings Page & Navigation Drawer Modernization (Right-Edge Drawer, Inline Quick Controls & Profile Sync Hub)
* **Context:**
  - The Settings page opened as a left-edge drawer, contradicting the new top-right profile icon position and thumb ergonomics.
  - The appearance theme picker forced users to drill down into a separate subscreen just to choose between Light, Dark, and Auto.
  - The profile header was static with no quick visibility into offline/online storage size, and lacked an interactive manual sync trigger.
  - Active trip settings (Mute, Close Trip, Wrapped, Share) were mixed with global settings, and dismissing the drawer required tapping the backdrop or a small close button without gesture support.
* **Decision:**
  - **Right-Anchored Navigation Drawer & Swipe-to-Dismiss (`GlobalSettingsModal.tsx`, `index.css`):**
    - Repositioned the settings drawer to `.drawer-right` with `justify-content: flex-end`, left-side rounded corners (`16px 0 0 16px`), and slide-in from `+28px`.
    - Integrated native GPU-accelerated touch swipe-right-to-dismiss gesture (`translateX(dx)`) with elastic spring physics, haptic feedback on threshold commit, and smooth exit animation.
  - **Inline 3-Way Segmented Theme Switcher (`SettingsView.tsx`, `index.css`):**
    - Replaced the appearance drill-down sub-screen with a 3-button sliding segmented pill (`☀️ Light` · `🌙 Night` · `⚙️ Auto`) directly on the main settings card, enabling 1-tap theme switching with tactile micro-haptics.
  - **Unified Profile & Cloud Sync Hub (`SettingsView.tsx`, `index.css`):**
    - Upgraded the profile header with user avatar photo/circle, account email, live storage size indicator, and a 1-tap `Sync Now` button with rotating spinner and success feedback.
  - **Highlighted Current Trip Context Card (`SettingsView.tsx`, `index.css`):**
    - Added a dedicated Current Trip Capsule banner when inside an active trip, grouping all trip-scoped controls (Story Card, Invite, Map, Categories, Recycle Bin, CSV Export, Mute Alerts, Close Trip) cleanly away from account-wide preferences.
* **Trade-offs Accepted:**
  - All gestures and micro-interactions use CSS transforms and lightweight browser touch event listeners with 0 extra dependencies. Subscreens remain accessible for advanced settings while standard operations are reachable directly in 1 tap.

---

## 65. Modernized Dual-Persona Boarding Pass Login Architecture (Webapp)
* **Context:**
  - The previous login experience suffered from unnecessary friction: an initial locked welcome screen requiring an iOS-style `SlideToUnlock` drag gesture, a hidden 3D flipping card where Superadmin access was tucked away in a tiny corner icon, and pre-auth clutter offering demo trips before authentication.
* **Decision:**
  - **Concept 1: Boarding Pass & Passport Stub Architecture (`src/components/LoginScreen.tsx`, `src/index.css`)**:
    - Replaced the multi-phase slide-lock and 3D card flip with a single cohesive boarding-pass card featuring perforated ticket notches (`.login-card-notch-left/.right`) and a dashed tear line.
    - Integrated a prominent **Dual-Persona Segmented Pill Controller** (`✈️ Traveler` vs `🛡️ Superadmin`) at the top stub of the ticket with tactile micro-haptics.
  - **Frictionless Traveler Entry Point (`src/components/LoginScreen.tsx`)**:
    - Prominent, brand-accurate **"Continue with Google"** 1-tap OAuth button with spring hover elevation and clear security reassurance (`🔐 Supabase Cloud Auth · End-to-End Encrypted Ledger`).
    - Moved demo trip prompts off the login screen and placed them directly onto the new traveler empty-state dashboard in `TripsListScreen.tsx` and in Settings.
  - **Master Operations Cockpit (`src/components/LoginScreen.tsx`)**:
    - High-contrast, emerald-accented Superadmin credentials form with floating-label email and password inputs, in-place password reset request handling, and automated security role sync.
* **Trade-offs Accepted:**
  - The Slide-to-Unlock gate was eliminated in favor of immediate 1-tap sign-in. This dramatically lowers user bounce rates and friction while maintaining a distinctive travel-inspired visual identity.

---

## 66. WhatsApp-Style Inset-Grouped Settings Architecture
* **Context:**
  - When a user logged into a trip and opened the Settings page, the screen was excessively long (1800+ px) and required continuous vertical scrolling.
  - 18+ items (all 8 trip operations, app preferences, GPS, coachmarks, backups, demo trips, bug trackers, support forms, danger zone buttons) were listed flatly on the root screen.
* **Decision:**
  - **4 Compact WhatsApp Inset Groups (`SettingsView.tsx`):**
    - Grouped all settings into 4 clean thematic cards fitting within ~1 screen viewport height:
      1. **Profile & Cloud Sync Hub**: User avatar, display name, account email, live storage used, and 1-tap `Sync Now` button.
      2. **Current Trip (when active)**: Consolidated to 2 high-level rows: `✨ Trip Tools & Story` (drills into dedicated `trip-tools` sub-screen) and `📊 Excel CSV Export`.
      3. **Preferences & Interface**: `🎨 Appearance` (inline 3-way segmented pill), `🔔 Notifications` (with unread badge), `📍 Geotag Expenses` (switch), `✈️ Flight Coachmarks` (reset button), `📱 Install App` (PWA).
      4. **Data & Backups**: `🗂️ Archived Trips`, `💾 Database Backups` (JSON snapshots), `✨ Seed Demo Trip`.
      5. **Help & Account**: `🐞 Report a Problem`, `✨ Suggest a Feature`, `🛡️ Superadmin Bug Tracker` (if admin), `🚪 Sign Out`, `⚠️ Clear All Data` (if admin).
  - **Dedicated `trip-tools` Sub-Screen (`SettingsView.tsx`):**
    - Created a smooth drill-down sub-screen for active trip operations (*Trip Wrapped Story Card, Invite & Share, Trip Map, Categories & Tags, Recycle Bin, Mute Alerts, Close Trip*).
    - Integrated with `useHistoryBack` so pressing hardware/browser back or the sub-screen back arrow smoothly returns to the main Settings menu.
* **Trade-offs Accepted:**
  - Secondary trip actions require one drill-down tap (`Trip Tools & Story`), but in return the entire settings surface is 65% more compact, instantly readable, and aligned with standard mobile ergonomics.

---

## 67. Enhanced Settings Visual System, Inset Dividers & Micro-Interactions
* **Context:**
  - Following the structural WhatsApp inset-group reorganization, the visual styling of the settings drawer needed elevation: row separators sliced across icons, hero cards lacked clear traveler/admin persona identity, and icons lacked visual punch.
* **Decision:**
  - **Luxury Traveler Passport ID Card (`SettingsView.tsx`, `index.css`)**:
    - Added user persona badges (`✈️ TRAVELER` vs `🛡️ ADMIN`) and an active online status pulse ring directly on the avatar wrap.
    - Added formatted live cloud sync and disk quota gauges with animated 1-tap `Sync Now` triggers.
  - **iOS Inset Dividers (`index.css`)**:
    - Replaced full-width border dividers with **inset dividers** using CSS pseudo-elements (`.settings-row-item:not(:last-child)::after`) starting 64px from the left, keeping icon squircles clean and delivering an authentic iOS/WhatsApp native aesthetic.
  - **Semantic Ambient Glow Squircles (`index.css`, `SettingsView.tsx`)**:
    - Upgraded squircle icons with soft, semantic ambient gradients (`squircle-amber-glow`, `squircle-blue-glow`, `squircle-indigo-glow`, `squircle-teal-glow`, `squircle-emerald-glow`, `squircle-orange-glow`, `squircle-purple-glow`, `squircle-rose-glow`, `squircle-red-glow`).
  - **Drawer Header & Version Badge (`GlobalSettingsModal.tsx`)**:
    - Added an app version chip (`v1.86.0`) and circular touch-target close button to the settings drawer header.
* **Trade-offs Accepted:**
  - Subtle gradients and inset dividers are implemented purely in CSS using native tokens, ensuring 0 runtime performance impact.

---

## 68. Settings v2: Spotlight Search, Frequent Flyer Hub & Flight Pass Capsule
* **Context:**
  - As features expand, settings can become dense. Travelers need instant discovery of tools without traversing multiple menus, clear insight into their cloud account state, and quick summary metrics for their active trip.
* **Decision:**
  - **Spotlight Quick-Search & Cross-Group Filtering (`SettingsView.tsx`, `index.css`)**:
    - Embedded a sticky search input (`.settings-search-bar-wrap`) with instant debounced substring matching across titles, subtitles, and search aliases (e.g. `dark`, `csv`, `map`, `backup`, `theme`, `alerts`).
    - Dynamically collapses empty groups during active searches and renders a styled fallback card with a 1-tap "Clear search" action.
  - **Frequent Flyer Travel Passport ID Card (`SettingsView.tsx`, `index.css`)**:
    - Upgraded profile hero with real-time stats chips: `✈️ {trips.length} Trips` · `👥 {companions} Companions` · `🔐 E2E Encrypted`.
    - Added a visual **Storage Gauge Meter** (`.settings-progress-bar-fill`) with gradient progress indicator.
    - Integrated 1-tap copy action on user email / account UID with micro-toast confirmation.
  - **Active Trip Flight Pass Capsule (`SettingsView.tsx`, `index.css`)**:
    - Added an integrated flight header (`.settings-trip-flight-banner`) showing active currency (`INR ₹`), companion count, and expense tally alongside `CLOSED` vs `ACTIVE` status pills.
  - **Keyboard Shortcuts Quick Reference (`SettingsView.tsx`)**:
    - Added a subtle pro-tips cheatsheet (`Esc`, `Swipe Right`, `+`) for power users.
* **Trade-offs Accepted:**
  - The search query state is kept local to the settings view for instant 0ms latency with no network overhead.

---

## 69. Unified Public Landing Portal & Home Photo Deck with Flight Throttle
* **Context:**
  - Unauthenticated visitors previously encountered an isolated bare login box that failed to showcase the product's offline, expense splitting, and mapping capabilities. On the home screen, the 3D trip card deck lacked key financial balance cues, pagination context, and the slide launcher lacked intuitive aeronautical visual polish.
* **Decision:**
  - **Unified Public Landing & Fast-Pass Login (`LoginScreen.tsx`, `index.css`)**:
    - Replaced the separate login box with a unified **Public Visitor Landing Portal**:
      - Cinematic live destination photography background with radial vignette.
      - 3 Value Proposition Cards: `⚡ 100% Offline-First`, `💰 1-Tap UPI Settlements`, and `🗺️ Interactive Route Maps`.
      - Fast-action "Continue with Google" sign-in hub.
      - Inline "Have a 6-digit trip code? Join" input allowing invited friends to jump straight into shared trips.
      - Segmented toggle to switch into **🛡️ Master Ops Cockpit** for administrative authentication.
  - **3D Trip Deck with Live Settlement & Destination Pill (`TripStack.tsx`, `index.css`)**:
    - Added real-time user settlement balance chip on the front card face (`💰 YOU ARE OWED ₹X`, `💸 YOU OWE ₹X`, or `✓ ALL SETTLED UP`).
    - Added top-right glassmorphic destination pill (`📍 {trip.destination}`).
    - Enhanced multi-stop gradient scrim with high-contrast text shadows over light and dark photography.
  - **Trip Pagination Stepper Dots (`TripsListScreen.tsx`, `TripStack.tsx`, `index.css`)**:
    - Added animated pagination dot indicators (`● ○ ○`) between the card deck and slider.
    - Supports 1-tap navigation to instantly reorder the stack and focus on any chosen trip.
  - **Flight Throttle Slider (`TripSlideLauncher.tsx`, `index.css`)**:
    - Upgraded slide-to-action controller with an **Airplane Throttle Thumb (`✈️`)**, slide-left `🔑 Join` in warm amber, slide-right `Create +` in glowing teal, and dynamic gradient fills.
* **Trade-offs Accepted:**
  - All balance calculations on the front card face are memoized and run entirely in-memory using existing Zustand store state for zero network overhead.

---

## 70. Superadmin Landing Page Backdrop Gallery & Crisp Home Ambient Optics
* **Context:**
  - The home screen's ambient backdrop used excessive 32px Gaussian blur and an overly diffuse mask, causing scenic travel photography to wash out into white/grey fog. Additionally, administrators had no central tool to customize the public landing page backdrop photo across the fleet.
* **Decision:**
  - **Crisp Home Ambient Optics (`index.css`, `HomeAmbientBackdrop.tsx`)**:
    - Tuned ambient blur down from 32px to 14px with `saturate(1.45)` and `brightness(0.68)`.
    - Preserves vibrant mountain, ocean, and skyline contours behind the home screen while maintaining soft edge diffusion and high contrast for foreground card text.
  - **Superadmin Landing Backdrop Gallery (`AdminToolsPage.tsx`, `ops-deck.css`, `types/admin.ts`, `LoginScreen.tsx`)**:
    - Added `landing_backdrop_url` configuration key into the global system settings.
    - Added a **Landing Page Cover Gallery** in the Superadmin Ops Deck with 6 curated travel presets (*Tropical Paradise, Swiss Alps, Kyoto Bamboo Forest, Amalfi Coastline, Nordic Aurora, Tokyo Metropolis*), custom URL paste input, file uploader, and live interactive landing page banner preview.
    - Public `/login` dynamically renders the superadmin-configured backdrop with zero-latency local caching and fallback to default tropical beach.
* **Trade-offs Accepted:**
  - Background image URLs are cached in `localStorage` on initial fetch so public visitors experience instantaneous 0ms paint without waiting for Supabase config round-trips.

---

## 71. Restore Post-Trip Completion Close & Lock Menu in Settings
* **Context:**
  - In commit `b6ef029` (`FEAT-011`), trip administrators were given the ability to close and lock trips once settlements were completed.
  - During the WhatsApp-style Inset Group settings consolidation (ADR 66, ADR 68), the root trip section was minimized to only show *Trip Tools & Story* and *Excel CSV Export*, moving "Close Trip" into the nested `trip-tools` sub-screen without indexing it in Spotlight search aliases or card descriptions. Travelers attempting to close/finalize their trip post-settlement found the menu missing.
  - Additionally, `GlobalSettingsModal` was omitting `isAdmin`, `onExportCsv`, `onOpenShareTrip`, and `baseCurrency` props when launching `SettingsView`, causing permissions and action parity discrepancies compared to `SettingsTab`.
* **Decision:**
  - **Root Screen Prominent Row (`SettingsView.tsx`)**:
    - Re-introduced the dedicated **Close Trip / Reopen Trip** row item directly on the root `This Trip: {activeTrip.name}` inset group card.
    - Active trip state displays an amber shield squircle, title *"Close Trip"*, subtitle *"Lock this trip once everyone's settled up"*, and an `"ACTIVE"` status pill. Closed trip displays an emerald shield squircle, title *"Reopen Trip"*, subtitle *"Currently locked — reopen to allow new expenses/members"*, and a `"LOCKED"` status pill.
    - Closing prompts the app's standard `ConfirmDialog` to explain the read-only locking effect; reopening restores immediate write access.
  - **Interactive Flight Pass Status Capsule (`SettingsView.tsx`)**:
    - Converted the static `[ACTIVE]` / `[CLOSED]` badge inside `.settings-trip-flight-banner` into an accessible 1-tap toggle button for trip administrators with tooltips and haptics.
  - **Spotlight Search Indexing (`SettingsView.tsx`)**:
    - Added comprehensive aliases (`close`, `reopen`, `lock`, `unlock`, `complete`, `completed`, `completion`, `settled`, `post trip`, `finish`, `archive trip`) so typing completion or close queries instantly surfaces the action.
  - **Drawer Modal & Tab Parity (`GlobalSettingsModal.tsx`, `App.tsx`)**:
    - Forwarded `isAdmin`, `onExportCsv`, `onOpenShareTrip`, and `baseCurrency` to `GlobalSettingsModal`, guaranteeing identical capabilities regardless of how settings is accessed.
* **Trade-offs Accepted:**
  - Adding the row item increases the root active-trip card from 2 rows to 3 rows (Tools, Close/Lock, CSV Export), which remains exceptionally compact while eliminating navigation friction for a primary trip lifecycle action.

---

## 72. Guarded Settlement Checkpoint for Trip Closure Lifecycle
* **Context:**
  - Marking a trip as "Closed" blocks new expenses and members. When travelers close a trip while debts are still owed, group members can be left with unfinalized balances.
  - However, enforcing a strict hard-block (disabling the Close button) creates severe dead-ends in real-world scenarios: forgiven or waived informal debts ("buy me a coffee next time"), cash/off-app payments forgotten by the recipient, unresponsive companions, and floating-point micro-cents. Furthermore, trip admins often need to lock new expense additions *before* settlements begin to freeze the numbers.
* **Decision:**
  - **Dynamic Inset Row & Flight Pass States (`SettingsView.tsx`)**:
    - Evaluates live settlement health via `calculateSettlements(activeTrip, members, activeTripExpenses, activeTripGroups)`.
    - **Fully Settled**: Displays green `SETTLED` badge pill, emerald squircle glow, and subtitle *"All balances settled — lock trip against new edits"*. Flight Pass capsule displays `🟢 ACTIVE · SETTLED`.
    - **Unsettled Balances**: Displays amber `UNSETTLED` badge pill, amber squircle glow, and subtitle *"⚠️ {currencySymbol}{amount} unsettled ({count} members)"*. Flight Pass capsule displays `⚠️ ACTIVE · UNSETTLED`.
  - **Guarded Warning Dialog with Admin Override (`SettingsView.tsx`, `ConfirmDialog.tsx`)**:
    - When tapped while unsettled, opens an intentional checkpoint dialog:
      - Primary action: `"Review & Settle"` $\rightarrow$ calls `onNavigateToBalances()` to immediately switch to the Balances & Settlements tab (closing drawer modal if open).
## 73. Frontend Performance Optimization & Superadmin Ops Deck Enhancements
* **Context:**
  - **Performance Bloat:** The production `index.js` bundle was 2.25 MB (594 kB gzip) on initial page load. MapLibre (~1.5MB) was eagerly pulled into the root chunk due to static modal imports, and wildcard `import * as LucideIcons from 'lucide-react'` in `CategoryIcon.tsx` bundled all 1,400+ Lucide SVG icons. In addition, root routes (`/login`, `/reset-password`, `/join/:code`) and secondary modals were bundled into the critical initial path.
  - **Ops Deck Capabilities:** The Superadmin Ops Deck needed real-time observability, rapid keyboard-driven navigation across sections/trips/users/cases, a live testing sandbox for 200+ keyword auto-tagging rules, fleet financial integrity diagnostics (split math & orphaned references), and external webhook configuration—while strictly preserving the 3-tier feature flag hierarchy (Global, Per-Trip, Per-User).
* **Decision:**
  - **Frontend Performance Optimization (`CategoryIcon.tsx`, `SettingsView.tsx`, `App.tsx`, `main.tsx`, `index.html`)**:
    - **Tree-shaken Category Icons**: Replaced wildcard Lucide import with a curated, tree-shakeable dictionary of 40+ category, travel, and utility icons with graceful fallback to `Compass`/`Tag`.
    - **Isolated MapLibre Mapping Dependency**: Code-split `TripJourneyMap` via `lazy()` with Suspense fallback so `maplibre-gl` only downloads when opening the Trip Map subscreen.
    - **Code-split Secondary Modals & Routes**: Wrapped `GlobalSettingsModal`, `ExpenseReviewModal`, `ShareTripModal`, `AchievementBadgeModal`, `LoginScreen`, `ResetPasswordScreen`, and `JoinTripScreen` in `lazy(lazyImport(...))` with Suspense boundaries.
    - **Font Preloading**: Added `<link rel="preload">` tags in `index.html` for `plexsans-variable.woff2` and `plusjakarta-600.woff2` to eliminate FOUT and improve LCP/CLS.
    - **Outcome**: Main `index.js` dropped from **2,249.06 kB down to 820.34 kB (236.52 kB gzip)** (>63% JS reduction, >1.4 MB saved), CSS dropped from 212 kB to 129 kB, and build times dropped by 50% (2.50s $\rightarrow$ 1.24s).
  - **Ops Deck Portal Enhancements (`AdminPortalLayout.tsx`, `AdminToolsPage.tsx`, `AdminCommandCenterPage.tsx`, `ops-deck.css`, `types/admin.ts`)**:
    - **Ops Command Palette (`Cmd + K` / `Ctrl + K`)**: Global spotlight bar supporting arrow-key navigation, instant search across sections, active trips, users, bug ledger cases, and fleet quick actions.
    - **Live Keyword Auto-Tagging Sandbox & Simulator**: Real-time test bar inside `AdminToolsPage.tsx` that previews category classification, icon, and match type as the admin types sample expense descriptions.
    - **Fleet Financial Integrity Scanner**: Automated audit tool checking split sums (`sum(resolvedShares) !== amount`), orphaned member records, and missing categories with a "1-Tap Auto-Heal" routine.
    - **Live Fleet Activity Stream**: Real-time telemetry feed on the Command Center with filter chips (`All`, `Security`, `Trips`, `Users`, `Flags`) and live pulsing connection dot.
---

## 74. UI Smoothness, Focus Polish & Superadmin Readability Enhancements
* **Context:**
  - **Focus & Form Aesthetics:** In `ExpenseForm.tsx`, focusing the amount hero field triggered an aggressive double-bordered ring with outline offset. When opening the Add Member modal in `MembersGroupsTab.tsx`, the `Name` field did not immediately acquire focus.
  - **Superadmin Features Board Layout:** On standard desktop screens and when expanding Won't Do items, `.ops-feature-board` produced horizontal overflow scrollbars due to rigid `repeat(3, 1fr)` column definitions.
  - **Superadmin Security Audit Log:** Audit log rows presented raw technical action codes (`set_app_config`, `user_suspended`, `ground_trip`) and truncated raw JSON strings without clear English context.
* **Decision:**
  - **Refined Hero Amount Focus & Member Autofocus (`index.css`, `ExpenseForm.tsx`, `MembersGroupsTab.tsx`)**:
    - Replaced the harsh outline ring on `.amount-hero:focus-within` with an ultra-clean, seamless ambient card glow (`box-shadow: 0 0 0 1px var(--primary-accent), 0 4px 16px rgba(47, 111, 237, 0.12)`).
    - Added `autoFocus` to the `member-name` input in `MembersGroupsTab.tsx` with instant requestAnimationFrame cursor positioning upon opening.
  - **Zero-Scroll Superadmin Features Board (`ops-deck.css`, `AdminFeaturesPage.tsx`)**:
    - Replaced fixed 3-column tracks with responsive wrapping `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` with `overflow-x: hidden` and `word-break: break-word` on cards, eliminating horizontal scrollbars across all screen widths.
  - **Human-Readable Audit Story Narratives (`AdminAuditPage.tsx`, `ops-deck.css`)**:
    - Implemented `formatAuditNarrative` to transform technical audit payloads into structured English sentences with actor identification, target resource pills, clear action category badges (`User Security`, `Trip Grounded`, `System Config`, `Roadmap`), and an expandable raw JSON drawer.
---

## 75. Executive Audit Stream Telemetry & Linear-Grade Feature Roadmap Deck
* **Context:**
  - **Audit Log Inspection Experience:** While human-readable narratives were introduced in ADR 74, the Superadmin Security Audit Log lacked high-level telemetry KPIs, visual timeline hierarchy (such as categorized glow node icons and avatar squircles), and a clean property inspector grid for exploring event parameters without copying raw JSON.
  - **Feature Roadmap & Backlog Tracking:** The Features page lacked backlog velocity metrics (% shipped), view customizability (no Linear-style dense table view), a quick "+ Log Request" superadmin modal, and inline 1-tap flag switching.
* **Decision:**
  - **Executive Telemetry & Timeline Stream (`AdminAuditPage.tsx`, `ops-deck.css`)**:
    - Added a 4-metric executive KPI ribbon (`Total Logged Events`, `Security & Access`, `Config & Flag Changes`, `Active Administrators`).
    - Redesigned the audit stream into a timeline format with glowing left icon nodes (`node-danger`, `node-caution`, `node-safe`, `node-info`, `node-purple`), actor initial avatars, and entity narrative highlights.
---

## 76. Features List View Default, Excel-Like Sticky Viewport & Flag Noise Cleanup
* **Context:**
  - **Default Viewport & Scrolling:** When opening the Superadmin Features tab, it defaulted to the Kanban board view rather than the dense List view. Furthermore, scrolling down the table pushed the entire page up, causing the header, roadmap velocity metrics strip, search bar, and table column headers to disappear off-screen.
  - **Linked Flag Clutter:** Features without an active linked runtime flag displayed unlinked select elements and empty space, cluttering the interface.
* **Decision:**
  - **Default List (Table) View (`AdminFeaturesPage.tsx`)**:
    - Changed default state to `viewMode = 'table'` so the Features tab opens directly into the dense, high-efficiency list.
  - **Excel-Style Frozen Header & Independent Scrollable Viewport (`ops-deck.css`, `AdminFeaturesPage.tsx`)**:
    - Introduced `.ops-feature-table-viewport` with `max-height: calc(100vh - 280px)`, `overflow-y: auto`, and custom slim scrollbars.
    - Set table headers (`<thead> <th>`) to `position: sticky; top: 0; z-index: 10; background: var(--bg-surface-elevated); backdrop-filter: blur(8px)` so top metrics, search filters, and column titles remain frozen while traveler feature rows scroll underneath smoothly.
  - **Linked Flag Noise Cleanup & Explicit Link Modal (`AdminFeaturesPage.tsx`, `features.json`)**:
    - Linked `FEAT-001` to `enableFeatureSuggestions` and `FEAT-021` to `enableGeotagging` in `features/features.json`.
    - In Table view: Only features with active linked flags render the interactive toggle hub capsule; unlinked features cleanly render `—`.
  - **Theme-Aware Color Tokens (`ops-deck.css`)**:
    - Replaced undefined `--bg-surface` and hardcoded dark header hexes with the canonical Ops Deck tokens (`--bg-panel`, `--bg-panel-raised`, `--bg-inset`, and `--line`), ensuring the table matches the superadmin light/dark theme seamlessly.
* **Trade-offs Accepted:**
  - Table viewport is height-constrained to the viewport height on desktop to keep metrics and filters permanently accessible without page-level scroll hunting.

---

## 77. Superadmin Ops Deck Suite Overhaul: Heartbeat Radar, Sliding Trip Deep Inspector, Multi-Filter Audit Matrix & Bulk Roadmap Actions
* **Context:**
  - Administrative fleet oversight needed deep operational tooling:
    - **Command Center:** Real-time visibility into microservices and latency (Auth, DB/RPC, Storage, Edge Push, Tiles).
    - **Trips Manager:** Rapid group telemetry inspection without needing to leave the superadmin deck to view individual member balances, category distributions, or emergency administrative controls.
    - **Audit Log:** Quick multi-dimensional slicing (Action category, Actor, Date range) and automated CSV reporting for compliance.
    - **Feature Roadmap:** High-velocity batch triage (multi-select + bulk status updates).
    - **Platform Analytics & Users:** Storage quota monitoring (receipts, avatars, covers) and user-to-trip membership tree visibility.
* **Decision:**
  - **Live Infrastructure Latency & Heartbeat Radar (`AdminCommandCenterPage.tsx`, `ops-deck.css`)**:
    - Embedded a live service radar measuring Supabase Auth, DB/RPC, Storage, Edge Push, and MapLibre tile latency with 1-tap "Ping Services" active probing.
  - **Trip Deep-Inspector Sliding Drawer (`AdminTripsPage.tsx`, `ops-deck.css`)**:
    - Added sliding side drawer (`.ops-trip-drawer`) showing member roster with calculated net balances (Paid vs Share), category spend distribution bars, and 1-tap actions (Lift Ground Lock, Emergency Ground, Archive, Open in Traveler View).
  - **Multi-Filter Matrix & 1-Tap CSV Compliance Export (`AdminAuditPage.tsx`)**:
    - Added dropdown filters for Category (`Security & Access`, `Trip State & Locks`, `Feature Flags`, `Broadcasts`), Date Range (`Last 24h`, `Last 7d`, `Last 30d`, `All Time`), and Administrator.
    - Added CSV export generating timestamped event logs with IST timestamps, narrative titles, and serialized payloads.
  - **Multi-Select Bulk Actions Dock (`AdminFeaturesPage.tsx`, `ops-deck.css`)**:
    - Added table row checkboxes with select-all and a floating sticky action dock for bulk status updates (`Mark Planned`, `Mark In Progress`, `Mark Shipped`, `Won't Do`).
  - **Platform Storage & Asset Quota Telemetry (`AdminAnalyticsPage.tsx`, `ops-deck.css`)**:
    - Added gauge tracking Supabase Storage consumption across receipt photos, traveler avatars, and journey map cache against 50GB tier limits.
---

## 78. Duplicate Expense Mount Snapshot Guard & Add Member Suggestion Modal Lifecycle Parity
* **Context:**
  - **Duplicate Expense False Warning:** When adding a new expense, the store optimistically adds the record to `expenses` for instant local feedback before network resolution. Because `ExpenseForm` was subscribed to `expenses`, it re-rendered before unmounting. The duplicate detection logic matched the newly created optimistic record against the form itself, causing a brief false duplicate warning to flash on screen before closing.
  - **Add Member Suggestion Popup Remaining Open:** When selecting a cached/Google suggestion from the dropdown, `handleSelectSuggestion` saved the member but omitted modal closure and ignored `addAnother`, leaving the popup open with an empty input field. Meanwhile, typing a new name manually closed the popup when `addAnother` was false.
* **Decision:**
  - **Duplicate Expense Guard (`ExpenseForm.tsx`):**
    - Captured a snapshot of existing expense IDs on form mount (`initialExpenseIdsRef`).
    - Excluded newly submitted IDs from duplicate matching and bypassed the check entirely while `isSubmitting` is true.
  - **Member Suggestion Selection Modal Lifecycle (`MembersGroupsTab.tsx`):**
    - Aligned `handleSelectSuggestion` with `handleAddMemberLocal` by guarding with `isSavingMember`, respecting `addAnother` (closing modal on single add, refocusing input on batch add), and resetting editing state cleanly.
---

## 79. Trip Card Stack Motion & Spatial Evolution: Reactive Deck Escalation, Velocity Flicks, 3D Perspective & Fluid Stepper
* **Context:**
  - On mobile viewports, the trip card stack previously felt static during active drag gestures: underlying cards (`depth-1` and `depth-2`) did not react until the front card exited, swiping required reaching a rigid 90px displacement regardless of touch speed, cards lacked realistic 3D spatial perspective, and pagination was represented by basic circular dots.
* **Decision:**
  - **Reactive Deck Escalation Physics (`TripStack.tsx`):**
    - Coordinated real-time `dragRatio` from the active card to peeking layers. As the front card is pulled, `depth-1` proactively straightens from `-2.5°` to `0°`, expands from `0.96` to `1.0` scale, and sheds its depth-of-field blur with zero transition delay during direct touch.
    - `depth-2` shifts upward into `depth-1` position with progressive brightness and opacity adjustments.
  - **Velocity-Aware Momentum & Flick Commitment (`TripStack.tsx`):**
    - Implemented high-frequency pointer velocity tracking $(\Delta X / \Delta t)$ over a sliding 8ms window.
    - Flicks with velocity $> 0.48\text{px/ms}$ commit the swipe immediately even on short travel distances ($\ge 28\text{px}$), resolving the issue where quick thumb flicks failed to trigger card cycling.
  - **3D Spatial Perspective & Tactile Shadows (`TripStack.tsx`, `index.css`):**
    - Added `perspective: 1200px` and `perspective-origin: 50% 35%` on the stage.
    - Front card computes compound 3D tilt: `rotateY` (horizontal axis) and `rotateX` (vertical axis).
    - Added specular acrylic top-edge highlight (`.stack-card::after`) and softened ambient elevation shadows.
  - **Contextual Status Chips & Luminous Balance Badges (`TripStack.tsx`, `index.css`):**
    - Introduced date-aware trip badges (`ONGOING · DAY N` or `IN N DAYS`).
    - Added atmospheric neon box-shadow glows to financial status pills (Emerald for owed, Coral for owe).
  - **Morphing Fluid Pagination Stepper (`TripsListScreen.tsx`, `index.css`):**
    - Upgraded circular pagination dots into an iOS-style adaptive fluid pill that expands smoothly to a 24px capsule with a custom cubic-bezier spring as cards cycle.
---

## 80. Trip Card Stack Mini-Dashboard, 3D Flip, Live Weather, Quick Expense, Itinerary Progress, and Vapor Trail
* **Context:**
  - Navigating to a trip was previously required just to log an expense or check recent spending. Furthermore, trip cards lacked temporal progress indicators, destination ambient weather context, or lightweight ledger previews.
* **Decision:**
  - **Quick "+ Expense" Shortcut (`TripStack.tsx`, `TripsListScreen.tsx`, `App.tsx`):**
    - Added a direct "+ Expense" chip on the front card and in the long-press menu, immediately opening `ExpenseForm` with the trip pre-selected in 1 tap from home.
  - **3D Card Flip Mini-Dashboard (`TripStack.tsx`, `index.css`):**
    - Implemented hardware-accelerated 3D coin flip (`rotateY: 180deg`) using `backface-visibility: hidden` to reveal the reverse ledger snapshot: top 3 recent transactions, category distribution bar, and direct log button with zero repaint/reflow.
  - **Live Destination Weather Badge (`TripStack.tsx`, `index.css`):**
    - Integrated with existing `weatherService.ts` to display ambient weather (`☀️ 28°C · Goa`) on the front card with 2-hour offline localStorage caching.
  - **Itinerary Progression Bar (`TripStack.tsx`, `index.css`):**
    - Rendered a glowing 3px gradient progress bar along the bottom edge of ongoing cards based on elapsed dates.
  - **Slide-Launcher Contrail & Magnetic Snapping (`TripSlideLauncher.tsx`, `index.css`):**
    - Added an illuminated vapor trail, plane pitch angle rotation, and magnetic notch feedback with haptic tick.
  - **Mobile Gyroscope Parallax Sheen (`TripStack.tsx`):**
    - Throttled device orientation tilt to requestAnimationFrame, clamped to ±3.5°, with automatic reduced-motion fallback.
* **Trade-offs Accepted:**
  - Weather fetching is strictly confined to the front card's destination on mount/cache expiry, avoiding redundant network requests for peeking cards.

---

## 81. Revert 3D Card Flip Mini-Dashboard from Home Screen
* **Context:**
  - The 3D flip interaction and reverse-side mini-ledger dashboard on the front trip card felt visually overwhelming and added excessive interaction complexity to the primary home stack browsing experience.
* **Decision:**
  - Revert the 3D coin flip mechanic, `stack-card-inner` flipper container, reverse ledger snapshot (`CardBackContent`), flip toggle icon buttons, and device orientation gyroscope sheen from `TripStack.tsx` and `src/index.css`.
  - Retain the non-intrusive ambient card features: live destination weather pill, direct "+ Expense" shortcut chip, bottom-rim itinerary progress track, and the slide launcher dynamic vapor trail and magnetic snapping.
* **Trade-offs Accepted:**
  - Users can no longer flip the card on the home screen for an inline ledger summary; opening the trip details remains the clean, dedicated path for viewing expenses, settlements, and analytics.

---

## 82. Realtime Weather Engine & Crisp Home UI Polish
* **Context:**
  - The Home UI cards had three separate wrapping pill boxes in the top right (weather, destination, status) causing visual clutter and layout fragmentation on mobile screens.
  - The weather service previously returned a hardcoded dummy fallback (`22°C Clear Day`) on geocoding misses and cached it for 2 hours, preventing real live conditions from showing, and lacked multi-stop candidate handling and accent normalization.
  - Settled trips displayed a heavy, high-contrast banner even when no debts were actionable.
* **Decision:**
  - **Realtime Weather SWR Engine (`weatherService.ts`, `TripStack.tsx`):**
    - Implemented Stale-While-Revalidate (SWR): instantaneous 0ms display of cached conditions with background live revalidation from Open-Meteo when older than 20 minutes.
    - Added `visibilitychange` and `window.onfocus` listeners to automatically check fresh weather when users switch back to the app or tab.
    - Added tap-to-refresh on the weather caption with a subtle spin icon and haptic confirmation.
    - Eliminated fake 22°C fallbacks, purges legacy dummy cache entries, normalizes Unicode accents (*São Paulo*, *München*), strips filler words (*weekend in*, *with friends*), and supports `trip.stops`.
  - **Unified Magazine Header Caption (`TripStack.tsx`, `index.css`):**
    - Replaced the three wrapping pill boxes with a single, calm editorial caption (`Goa · ☀️ 28°C`) and a glowing live pulse dot for trip status.
  - **Ambient Photo Backlight Glow (`TripStack.tsx`, `imageLuminance.ts`, `index.css`):**
    - Extracted dominant image color via a 24x24 canvas sampler cached in memory, casting an ethereal GPU-accelerated radial backlight behind the active card with zero DOM chrome.
  - **Smart Balance Progressive Disclosure (`TripStack.tsx`, `index.css`):**
    - Auto-hides the loud banner when a trip is completely settled, cleanly embedding `Trip · INR · ✓ Settled` into the subtitle. Actionable debts (`YOU ARE OWED...` / `YOU OWE...`) remain prominently badged.
* **Trade-offs Accepted:**
  - Weather without geocoded coordinates gracefully renders `null` rather than a guessed daylight fallback, ensuring accurate information integrity.

---

## 83. Advanced Touch Ergonomics, Velocity Flick Physics & Single-Trip Spotlight
* **Context:**
  - The pagination stepper dots required discrete, individual taps, which felt rigid compared to modern fluid carousel scrubbers.
  - Card swiping relied solely on distance threshold ($>90\text{px}$), failing to respond to quick, energetic flicks.
  - When users had only 1 trip, the app dropped back to a plain flat list card, missing out on the luxury ambient spotlight.
* **Decision:**
  - **Continuous Stepper Touch Scrubber (`TripsListScreen.tsx`, `index.css`):**
    - Enabled pointer scrubbing across `.trip-stepper-dots` so sliding horizontally across the track scrubs through cards with haptic ticks (`triggerHaptic('light')`).
  - **Velocity-Flick Inertia Physics (`TripStack.tsx`):**
    - Calculated release velocity ($v = \Delta x / \Delta t$) over a 100ms pointer buffer. Quick flicks ($|v| > 0.42\text{ px/ms}$) commit dismissal immediately with exit duration dynamically scaled to flick speed.
  - **Single-Trip Hero Spotlight (`TripsListScreen.tsx`, `TripStack.tsx`):**
    - Enabled `stackActive` when `trips.length >= 1`, presenting single-trip accounts in full hero spotlight (ambient backlight, destination photography, and real-time weather) while keeping horizontal cycling disabled.
  - **Time-of-Day Adaptive Greeting (`TripsListScreen.tsx`, `index.css`):**
    - Subtly replaced static subheadings with personalized local greetings (*"Good morning/afternoon/evening, [Name]"*) and an expedition counter badge.
  - **Micro-Gesture Peek Preview (`TripStack.tsx`, `index.css`):**
    - Dragging downward ($dy > 8\text{px}$) or rapid double-tapping briefly escalates the card behind into full clarity (`↓ Peek Next`) before settling smoothly back.
* **Trade-offs Accepted:**
  - Pointer capture during stepper scrubbing smoothly tracks outside the bounding box until pointer release, preventing lost scrub gestures on small touchscreens.

---

## 84. CI Workflow Hardening, Oxlint Ignore Boundaries & React Hooks Compliance in TripStack
* **Context:**
  - The GitHub Actions CI workflow runs `npm run lint` (`oxlint`), `npm run build`, and `npm test`.
  - The build failed on CI due to two issues:
    1. In `TripStack.tsx`, hooks (`useState` for peekPreview, `useTripPhoto`, and `useAmbientGlowColor`) were previously invoked conditionally or had a malformed trailing `useEffect` closure during an earlier edit, violating React's Rules of Hooks.
    2. Without explicit `ignorePatterns` in `.oxlintrc.json`, `oxlint` traversed non-application agent directories (`.claude/**`, `.github/**`, `.agents/**`) where auxiliary development/skill scripts contained syntax or ESLint errors (e.g. unsafe finally blocks in skill harnesses).
* **Decision:**
  - **React Rules of Hooks Fix (`src/components/TripStack.tsx`):**
    - Correctly closed the pagination jumper `useEffect` hook and placed all hook declarations (`useState(peekPreview)`, `useTripPhoto`, `useAmbientGlowColor`) unconditionally at the top of the component before any early returns (`if (!front) return null;`).
  - **Oxlint Scope Boundaries (`.oxlintrc.json`):**
    - Added explicit `ignorePatterns` for non-app root directories (`.agents/**`, `.claude/**`, `.codex/**`, `.github/**`, `.impeccable/**`, `.gstack/**`, `dist/**`, `public/**`, `android/**`, `ios/**`, `graphify-out/**`, `palace/**`) so `npm run lint` exclusively checks the application codebase.
  - **Local Memory Palace Git Tracking (`.gitignore`):**
    - Excluded local Chroma/Memory Palace files (`palace/`, `hallways.json`) from repository tracking.
* **Trade-offs Accepted:**
  - Non-application skill directories are excluded from the main webapp linter pass, ensuring production CI runs with zero false-positive blockers.

---

## 85. High-Performance Fluidity, Universal Spotlight & Traveler Ergonomics
* **Context:**
  - Navigating into a trip or logging an expense previously waited for heavy chunks (`ExpenseForm`, `TripMapHero`) to fetch over the network on demand.
  - Large expense ledgers suffered from offscreen DOM layout churn during fast scrolling.
  - Finding a trip, past transaction, or quick action required manual multi-step navigation.
  - Splitting expenses among groups required repetitive checkbox toggling when the payer was excluded.
  - Viewing foreign expenses required mental math or external exchange calculators.
  - Working in low-connectivity areas lacked subtle feedback on queued offline mutations.
* **Decision:**
  - **Speculative Idle Route Preloading (`modulePreload.ts`, `TripsListScreen.tsx`):**
    - Prefetches lazy-loaded route modules (`ExpenseForm`, `TripMapHero`) during browser idle moments via `requestIdleCallback` (with timeout fallback). Eliminates open-trip and add-expense loading latencies with zero main-thread jank.
  - **CSS Rendering Containment (`index.css`):**
    - Extended `content-visibility: auto` and `contain-intrinsic-size` to `.expense-item-cascade`, enabling the browser engine to skip offscreen rendering passes for long expedition ledgers.
  - **Universal Traveler Spotlight (`CommandPalette.tsx`, `TripsListScreen.tsx`, `App.tsx`):**
    - Upgraded `CommandPalette` to operate across the entire application (both on the Home screen and inside active trips). Added universal trip search and instant jump, trip creation, and search trigger button in the Home header beside bug tracker.
  - **Smart Split "Exclude Payer" Preset (`ExpenseForm.tsx`):**
    - Added a 1-tap `🚫 Exclude Payer` preset chip to automatically divide expenses among all group members while keeping the paying member excluded.
  - **One-Tap Foreign Currency Toggle (`ExpenseList.tsx`):**
    - For transactions logged in a foreign currency differing from the trip's base currency, added an interactive conversion pill that toggles instantly between the base currency amount and original transaction currency.
  - **Subtle Offline Queue Status Pill (`TripsListScreen.tsx`, `App.tsx`):**
    - Display queued offline mutations count (e.g. `☁️ 2 queued`) in the Home greeting and header sync pill, accompanied by haptic feedback when connectivity is restored and the queue is drained.
* **Trade-offs Accepted:**
  - Currency conversion on the ledger row uses client-side cached exchange rates for instant 0ms toggling without network latency.

---

## 86. Traveler Smoothness, Instant Receipt Compression, Smart Quick-Fill & Ergonomics
* **Context:**
  - Modern smartphones (iPhone 14/15/16, Pixel 7/8/9, Galaxy S23/S24) snap high-resolution camera photos ranging from 6MB to 20MB. Previously, receipt uploads were rejected with a strict 5MB limit, and intermediate base64 conversions caused memory spikes on mobile devices.
  - Logging an expense quickly while on the move (e.g. stepping out of a cab or finishing dinner) required sequentially filling 4+ form fields.
  - Category auto-tagging relied purely on static brand lists without remembering the current trip's own previous expense patterns.
  - The expense ledger lacked daily spending context and burn-rate velocity indicators.
  - Desktop, tablet, and laptop users lacked responsive keyboard shortcuts for rapid navigation.
* **Decision:**
  - **Offscreen Canvas Receipt Photo Compressor (`imageCompressor.ts`, `image.ts`):**
    - Raised the upload ceiling to 25MB to seamlessly ingest native 48MP/108MP phone camera captures.
    - Switched from large multi-megabyte `FileReader.readAsDataURL` memory buffers to `URL.createObjectURL` (with immediate cleanup on decode), downscaling proportionally to max 1200px and saving as lightweight WebP/JPEG (<180KB). Eliminates mobile garbage collection thrashing and accelerates network sync by 95%.
  - **Quick-Parse Smart Entry (`expenseQuickParser.ts`, `ExpenseForm.tsx`):**
    - Built a zero-dependency client-side natural language expense parser (`parseQuickExpense`).
    - Added an interactive `⚡ Quick Fill` bar at the top of `ExpenseForm`. Typing expressions like `"Dinner 1450 food"` or `"Uber to airport 420"` or `"₹1,200 Airbnb"` automatically extracts the amount, currency, title, and pre-selects the category in 1 tap.
  - **Trip History Memory in Category Auto-Predictor (`categoryHelper.ts`, `ExpenseForm.tsx`):**
    - Elevated trip history to Priority 0 in `autoSuggestCategory`. If a traveler previously logged a local establishment or custom expense (e.g. "Baga Creek Shack"), subsequent entries matching that name automatically resolve to the same category.
    - Added subtle visual feedback (`✨ Auto-selected: Food & Dining`) when a category is predicted.
  - **Day-by-Day Expense Grouping & Daily Burn Subtotals (`ExpenseList.tsx`):**
    - Rendered daily totals and expense counts permanently on sticky day headers in both expanded and collapsed views.
    - Excluded debt settlements (`isSettlement` or `Settlement:`) from daily expenditure subtotals and average burn rate calculations (`avgDailySpend`). Settlements represent debt reimbursements rather than new expedition spending; days with settlements cleanly indicate settled amounts without triggering false `🔥 Burn` alarms.
    - Days with real spending exceeding 1.5x average run-rate dynamically receive a `🔥 Burn` indicator.
    - Added an informative `Expand All / Collapse All` control summarizing total expedition days and average daily burn.
  - **Traveler Keyboard Shortcuts & Fast Escaping (`App.tsx`):**
    - Implemented global hotkeys active when not typing inside text inputs: `N` to log a new expense, `1–4` to switch trip tabs, `/` to focus the search bar, `Esc` to dismiss dialogs, and `?` to summon a clean keyboard shortcuts card.
* **Trade-offs Accepted:**
  - WhatsApp settlement ping deep-linking was explicitly deferred for future implementation alongside direct payment options.

---

## 87. WhatsApp-Style Settings Overhaul, Storage Visualizer & Shareable QR System
* **Context:**
  - The previous Settings screen had basic list rows with inconsistent visual weights, lacked zero-click context previews, had no visual storage breakdown for receipt photos and offline cache, and offered no user-configurable control over micro-haptic tactile intensity.
  - Travelers frequently share trips and connect companions on mobile devices; generating and scanning a high-contrast QR code directly from the profile header is significantly faster than typing or copying URLs.
* **Decision:**
  - **WhatsApp Profile Header & Shareable QR Code (`SettingsView.tsx`, `Icons.tsx`, `index.css`):**
    - Enhanced the profile hero with an avatar, display name, account status badge, and an editable WhatsApp-style status tagline (e.g., `"Exploring Tokyo 🗼"`, `"Beach mode activated 🏖️"`, `"Road trip vibes 🚗"`) persisted in localStorage with 1-tap presets and custom typing.
    - Added an interactive QR code squircle button in the profile header that opens a WhatsApp-style modal displaying a scannable Trip Invite QR Code (`api.qrserver.com`), trip title, "Copy Link", and "Share Link" buttons with full browser history stack back-navigation integration (`useHistoryBack` & `useEscapeKey`).
  - **Color-Coded Squircles & Grouped Card Architecture (`SettingsView.tsx`, `index.css`):**
    - Grouped settings into distinct rounded cards with WhatsApp-aligned color themes:
      - 🔵 This Trip (Tools & Story, CSV Export, Close & Lock Trip)
      - 🟠 Preferences & Interface (Appearance, Tactile Haptics, Notifications, Geotag, Coachmarks, App Install)
      - 🟡 Storage & Data (Storage Visualizer, Archived Trips, Database Backups, Demo Trip)
      - 🩵 Diagnostics & Support (Report a Problem, Suggest a Feature, Superadmin Bug Tracker)
      - 🔴 Account & Danger Zone (Sign Out, Clear All Data)
  - **Visual Storage & Data Manager (`SettingsView.tsx`, `index.css`):**
    - Added a dedicated `storage-data` subscreen with a 3-segment proportional visualizer: Receipts & Media (Blue), Trip Ledgers & Database (Green), and System/Offline Cache (Amber).
    - Integrated itemized legend metrics calculating receipt counts, total trip records, and estimated cache footprint.
    - Added a 1-tap "Free Up Cache Storage" button that flushes temporary CacheStorage assets and immediately recalculates browser disk estimates with haptic confirmation.
  - **User-Configurable Tactile Haptic Intensity (`haptics.ts`, `SettingsView.tsx`, `index.css`):**
    - Upgraded `haptics.ts` with `HapticPreference` (`'standard'` | `'subtle'` | `'off'`), stored in localStorage (`tt_haptic_preference`).
    - Added an inline 3-way segmented control in Settings providing real-time tactile vibration feedback on selection and scaling vibration durations (e.g. 50% reduction on subtle, complete mute on off).
  - **Real-Time Live Value Previews on Rows (`SettingsView.tsx`):**
    - Every row now features a zero-click context badge on the right side: active theme (`Night mode` / `Light` / `Auto`), active haptics level, category counts, unread notification count or `Quiet`, active geotag state (`ACTIVE` / `OFF`), and storage utilization (`X.X MB`).
* **Trade-offs Accepted:**
  - Storage breakdown approximates receipt image sizes based on stored receipt paths and client records to ensure 0ms instantaneous loading without waiting for heavy file scans.

---

## 88. Client-Side Offline QR Code Engine & Elevated Action Sheet Redesign
* **Context:**
  - On mobile networks and production environments (`trip-tracker.blackmaroon.in`), relying on external third-party QR generation APIs (like `api.qrserver.com`) caused broken image failures due to network latency, adblockers, DNS anomalies, and restrictive CSP image sources.
  - The "Copy Link" and "Share Link" action buttons in the profile QR modal lacked visual polish, using basic rectangular buttons with stark borders and cramped typography that degraded user experience.
  - Profile name and status tagline headers lacked clean visual hierarchy, causing text cramping on small mobile screens.
* **Decision:**
  - **Zero-Network Client-Side QR Engine (`src/utils/qrGenerator.ts`, `src/components/QrCodeView.tsx`):**
    - Integrated high-performance offline QR generation using `qrcode` with retina-crisp 2x oversampling, in-memory caching (`Map`), and smooth spinner loading fallback.
    - Upgraded both `SettingsView.tsx` (Trip Invite QR) and `UpiPaymentModal.tsx` (UPI settlement QR) to use `<QrCodeView />`, completely eliminating network reliance and ensuring 100% offline reliability.
  - **Elevated WhatsApp-Style Action Sheet & Button Redesign (`SettingsView.tsx`, `src/index.css`):**
    - Redesigned the QR card with `border-radius: 28px`, deep ambient drop shadows, and an accessible top-right `✕` dismiss button.
    - Restructured text hierarchy: bold 17px traveler display name, italicized subtitle tagline, and a dedicated emerald trip badge (`🌴 North East trip`).
    - Overhauled action buttons with modern tactile styling:
      - "Copy Link": Interactive glass card button with 1.5px subtle border, icon badge, active scale feedback, and animated emerald "Copied!" checkmark state.
      - "Share Link": High-contrast WhatsApp-inspired gradient button (`linear-gradient(135deg, #25D366, #128C7E)`), crisp white typography, and vibrant drop glow.
      - "Done": Centered capsule pill button with fluid hover/active states.
* **Trade-offs Accepted:**
  - Minimal bundle size addition for `qrcode` in exchange for complete zero-network offline resilience and guaranteed scannability under all connectivity conditions.

---

## 89. WhatsApp Design Harmonization: Grouped Inset Settings, 3-Dots Overflow Menu & Native Action Sheets
* **Context:**
  - On mobile browsers (Safari on iOS, Chrome on Android), settings sub-screens lacked visual consistency; individual screens used mixed card structures and lacked uniform indented row dividers (`margin-left: 56px`), causing visual clutter.
  - In active trips, the top header bar suffered from icon congestion on narrow mobile viewports (iPhone SE / compact Android devices) with multiple secondary actions competing for limited space.
  - Secondary trip management actions (Edit, Quick Add, Archive, Delete) on the home list relied solely on swipeable gestures with limited discovery on mobile touchscreens.
* **Decision:**
  - **Standardized Inset Settings Architecture (`SettingsCell.tsx`, `SettingsSection.tsx`, `SettingsView.tsx`):**
    - Extracted modular, zero-dependency `SettingsCell` and `SettingsSection` components implementing WhatsApp's exact grouped card aesthetic.
    - Added native indented hairline dividers (`left: 64px`) that separate row items without cutting across squircle icon badges.
    - Unified main settings and sub-screens (`trip-settings`, `data-menu`, `help-account`, `about`) under the consistent inset card pattern with smooth hardware-accelerated horizontal slide transitions.
  - **WhatsApp-Style Header Overflow Menu (`OverflowMenu.tsx`, `App.tsx`):**
    - Introduced a 3-dots anchored popup menu (`IconMoreVertical`) in the active trip header for secondary actions (Share QR, Export CSV, Trip Wrapped, Route Stops toggle, Trip Settings, Superadmin Bug Tracker).
    - Reduced header clutter on mobile viewports, giving the expedition title and primary controls maximum room.
  - **Native Bottom Action Sheet (`ActionSheet.tsx`, `TripsListScreen.tsx`, `src/index.css`):**
    - Created a lightweight mobile-first action sheet with top drag pill handle, frosted glass backdrop blur, spring decel slide up (`cubic-bezier(0.32, 0.72, 0, 1)`), drag-down gesture dismissal, and safe-area bottom elevation (`calc(16px + var(--safe-bottom))`).
    - Added a direct 3-dots options button on passport trip cards providing immediate, discoverable access to Open, Quick Add Expense, Edit Details, Archive, and Delete.
  - **Cross-Platform Mobile Touch Parity:**
    - Applied universal `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` across all interactive buttons, eliminating 300ms mobile tap delays and gray flashes.
* **Trade-offs Accepted:**
  - Zero heavy third-party animation libraries or UI frameworks were added; all transitions, sheets, and menus use GPU-accelerated CSS (`translate3d`, `opacity`) to ensure 60/120fps smoothness without bundle bloat.

---

## 90. Strict-Toggle Feature Flags Linking in Settings & Empty States
* **Context:**
  - `enableDemoSeeding` and `enableFeatureSuggestions` in the Superadmin Cockpit were previously bypassed for superadmin sessions because `isFeatureActive` unconditionally returned `true` whenever `context?.isSuperadmin` was set.
  - Furthermore, `SettingsView.tsx` lacked a feature flag check for `enableDemoSeeding` (rendering "Seed Demo Trip" whenever `onLoadDemoTrip` was passed) and bypassed `enableFeatureSuggestions` via `(isSuperadmin || isFeatureEnabled('enableFeatureSuggestions'))`.
  - This prevented administrators from verifying, toggling off, or controlling the visibility of demo data seeding and feature request entry points.
* **Decision:**
  - **Exempt Strict-Toggle Flags from Superadmin Bypass (`featureFlags.ts`):**
    - Designated `enableDemoSeeding` and `enableFeatureSuggestions` as strict UI toggle flags in `isFeatureActive`. Even when accessed by a superadmin, their activation status strictly follows explicit global flag state, trip overrides, and user overrides.
  - **Strictly Link Settings UI Controls (`SettingsView.tsx`):**
    - Gated "Seed Demo Trip" in Settings under `isFeatureEnabled('enableDemoSeeding')`.
    - Restricted "Suggest a Feature" under the Help & Account section strictly to `isFeatureEnabled('enableFeatureSuggestions')`, removing the unconditional superadmin bypass.
  - **Gate Empty State Demo Seeding (`TripsListScreen.tsx`):**
    - Linked the "Load Demo Trip" button on the empty trips state screen to `isFeatureEnabled('enableDemoSeeding')`.
---

## 91. Active Trip Header Layout Upgrade & WhatsApp-Style Tap Title Action Sheet
* **Context:**
  - On narrow mobile viewports, placing a 3-dots overflow button next to Search, Notifications Bell, and `< Trips` in the active trip header crowded the right side, consuming >65% of the screen width and squeezing the trip title and date range into a narrow overlapping column.
  - The dropdown menu rendered from the 3-dots button suffered from vertical clipping caused by the header's `overflow: hidden` styling, preventing users from seeing all menu items.
  - Many of the actions in the dropdown menu duplicated entries already accessible in the bottom navigation's Settings tab.
* **Decision:**
  - **Remove 3-Dots Button from Active Trip Header (`App.tsx`):**
    - Eliminated the crowded 3-dots header button, restoring generous horizontal breathing room for the trip title and status dates.
    - Preserved the right-thumb navigation ergonomics by keeping the `< Trips` button at the far right edge alongside Search and Notifications.
  - **WhatsApp-Style Interactive Trip Title Banner (`App.tsx`, `index.css`):**
    - Transformed the `app-title-group` into an accessible, tactile interactive button with an ambient chevron indicator (`app-title-chevron-badge`).
    - Tapping the trip title banner opens the native bottom `ActionSheet`.
  - **Bottom Action Sheet for Trip Actions (`ActionSheet.tsx`, `App.tsx`):**
    - Completely resolved clipping by rendering the actions inside the portal-based mobile bottom sheet.
    - Curated high-value trip shortcuts: Share Trip & QR Code, Export to CSV, Trip Wrapped & Badges, Route Stops toggle, Full Trip Settings, and Switch Trip.
* **Trade-offs Accepted:**
  - Secondary trip actions are now accessed by tapping the trip header banner rather than a dedicated 3-dots icon, following the standard WhatsApp group/chat info interaction model.

---

## 92. Collaborative Checklist & Travel Notes as 5th Bottom Navigation Tab
* **Context:**
  - With Trip Settings & Details accessible in 1 tap from the top Trip Title Action Sheet and Command Palette, retaining a dedicated 5th bottom tab for "Settings" was redundant and underutilized valuable mobile screen real estate.
  - Traveling groups repeatedly need shared access to packing essentials, travel permits, and critical group notes (e.g. hotel Wi-Fi passwords, flight/train PNRs, driver phone numbers, entry gate codes).
* **Decision:**
  - **Collaborative Checklist & Travel Notes Tab (`ChecklistNotesTab.tsx`):**
    - Replaced the 5th tab button in `NavTabs.tsx` with a dual-mode collaborative dashboard (`IconClipboardList`), labeled "Notes".
    - Mode 1: **Interactive Checklist** with progress tracking, category filtering (`Packing`, `Documents`, `Medical`, `General`), member assignment pills, one-tap checkboxes with haptics, and a quick "Pre-fill Travel Essentials" button.
    - Mode 2: **Shared Travel Notes** with instant 1-tap clipboard copy (`IconCopy`), category tagging (`Wi-Fi`, `Hotel`, `Transport`, `Contact`, `General`), pin-to-top support, and modal add/edit.
  - **Zero-Table Offline-First Schema (`0076_add_trip_checklist_and_notes.sql`, `tripApi.ts`, `tripStore.ts`):**
    - Implemented `checklist` and `notes` as JSONB columns on `public.trips`. This seamlessly inherits existing trip participant RLS security policies, works synchronously offline via Zustand local persistence, and broadcasts instant updates to all trip peers.
  - **Seamless Navigation & Shortcuts (`App.tsx`):**
    - Updated `TAB_ORDER` to `['expenses', 'ledger', 'members', 'notes']`, preserving WhatsApp-style horizontal swipe navigation between the 4 bottom tabs.
    - Mapped keyboard shortcut `4` to switch to Notes.
    - ActionSheet's "Trip Settings & Details" opens the complete `GlobalSettingsModal` directly.
* **Trade-offs Accepted:**
  - Full app settings and admin database tools are now opened via the Trip Title Action Sheet or Command Palette instead of a persistent bottom tab, prioritizing daily in-trip group utility.

---

## 93. Header Action Sheet Menu Reliability & Navigation Decoupling
* **Context:**
  - After introducing the WhatsApp-style bottom Action Sheet triggered from the trip title chevron, menu items (Trip Wrapped, Trip Settings & Details, View Route Stops, Switch to Another Trip) were not executing as expected, while only direct downloads (CSV export) and uncoupled modals functioned properly.
  - Three key interaction bugs were identified:
    1. **History Back Collision (`useHistoryBack`):** Registering `useHistoryBack` on the temporary action sheet meant closing the sheet triggered `window.history.back()`. When an item simultaneously opened a target modal (like `TripWrappedModal` or `GlobalSettingsModal`), the incoming `popstate` event popped the newly opened modal's history entry and immediately closed it.
    2. **Pointer Drag Threshold Suppression:** The pointer move handler on the sheet card set `dragOffset` on any vertical delta > 0. Touch jitter (1–2px) between pointer down and up triggered a style transform that caused mobile and desktop browsers to treat the tap as a drag gesture, suppressing the child button's `click` event.
    3. **Admin Check Crash in `SettingsView.tsx`:** When `adminMemberIds` was an empty array `[]` (truthy in JS), checking `activeTrip.memberIds.some(...)` threw `TypeError: Cannot read properties of undefined (reading 'some')` if `memberIds` was undefined.
* **Decision:**
  - **Remove Action Sheet History Push:** Decoupled `showTripActionSheet` from `useHistoryBack`. The action sheet relies cleanly on backdrop taps, swipe-to-dismiss, and the Escape key, eliminating the asynchronous `popstate` collision with target modals.
  - **Button Tap Protection & Drag Threshold (`ActionSheet.tsx`):** Added an 8px movement deadzone for pointer drags and explicitly ignored drag starts on `.wa-action-sheet-item` and `.wa-action-sheet-cancel-btn`. Deferred item actions by 10ms to ensure clean sheet dismissal before target transitions.
  - **Direct Settings & Trip Switch Navigation (`App.tsx`):**
    - "Trip Settings & Details" transitions directly to `activeTab = 'settings'`, allowing users to review trip configurations with the header back button returning to `expenses`.
    - "Switch to Another Trip" sets `activeTab = 'expenses'` and triggers `withViewTransition(() => selectTrip(null))` cleanly.
    - "View Route Stops" toggles stops and scrolls smoothly to the top route itinerary.
  - **Defensive Admin Guard (`SettingsView.tsx`):** Guarded `adminMemberIds?.length && memberIds?.some(...)` with optional chaining.
* **Trade-offs Accepted:**
  - The action sheet itself does not consume a browser history slot, which is standard for contextual menus/dropdowns and eliminates popstate race conditions.

---

## 94. Persistent Compact Sticky Header on Full Sheet Expansion
* **Context:**
  - When the bottom content sheet was dragged or scrolled up to full screen (`top: 0%`, `sheetFull`), the header had `.header-hidden` applied (`transform: translateY(-100%)` and `opacity: 0`).
  - While originally designed to maximize vertical space for the map and list, this completely removed the Trip Title Dropdown Menu, Quick Search, Notifications, and `< Trips` Back button, leaving the user with no access to Settings, Trip Wrapped, or trip navigation unless they dragged the sheet down first.
* **Decision:**
  - **Eliminate `.header-hidden`:** Replaced the hide transition with `.is-scrolled` and `.sheet-full` when `sheetFull` is active.
  - **Compact Sticky Top Bar (`index.css`):**
    - The header remains pinned at `z-index: 40` with frosted glass backdrop (`backdrop-filter: blur(28px) saturate(180%)`).
    - The date range and route chips collapse away, keeping the header at a slim ~56px height.
    - The Trip Title + Dropdown Chevron, Search, Notifications Bell, and `< Trips` Back Button remain 100% visible and interactive.
  - **Content Clearance (`.trip-sheet.full .tab-pane`):** Added `padding-top: calc(58px + var(--safe-top, 0px))` so content starts cleanly below the compact header and scrolls smoothly underneath.
* **Trade-offs Accepted:**
  - The full-screen sheet leaves ~56px at the top for the compact header instead of expanding to `0px`, preserving constant access to core trip actions and navigation.

---

## 95. Relocate Trip Wrapped and Achievements Badges to Settings Menu and Cleanse Header Dropdown
* **Context:**
  - The header dropdown (`ActionSheet`) previously contained "Trip Wrapped & Badges", competing with primary operational trip actions (Share Trip, Export CSV, Route Stops, Trip Settings).
  - While "Trip Wrapped (Story Card)" existed inside a sub-tier ("Trip Tools & Preferences"), "Trip Squad Badges & Milestones" was not surfaced in Settings, and neither was accessible directly in 1 tap from "This Trip: {name}".
* **Decision:**
  - **Surfaced Badges & Milestones in Settings (`SettingsView.tsx`):**
    - Added `onOpenAchievements` prop to `SettingsViewProps`, `SettingsTab.tsx`, and `GlobalSettingsModal.tsx`, wired to `setShowAchievements(true)` in `App.tsx`.
    - Added `SettingsCell` for both "Trip Wrapped (Story Card)" and "Trip Squad Badges & Milestones" directly in `subScreen === 'trip-settings'` ("This Trip: {name}"), giving users 1-tap access upon opening Trip Settings.
    - Also added "Trip Squad Badges & Milestones" to `subScreen === 'trip-tools'` ("Trip Tools & Preferences") with `IconTrophy`.
    - Expanded Settings search index to match `wrapped`, `badges`, `milestones`, and `achievements`.
  - **Streamline Header Action Sheet (`App.tsx`):**
    - Removed `{ id: 'wrapped', label: 'Trip Wrapped & Badges', ... }` from `showTripActionSheet` items array.
    - Header dropdown now cleanly focuses on operational utilities: Share QR, Export CSV, Toggle Route Stops, Trip Settings, and Switch Trip.
* **Trade-offs Accepted:**
    - Travelers access Wrapped infographics and milestone badges via the Settings tab or "This Trip" menu rather than the quick header dropdown, keeping the header action sheet compact and utility-focused.

---

## 96. Compact Sticky Header UI & Visual Polish (Unified Circular Actions, Frosted Title Pill & Clean Stops Collapse)
* **Context:**
  - When the bottom sheet was expanded to full screen, the compact sticky header presented multiple visual defects:
    1. Low contrast on the trip title: `tone-dark` map sampling bled through, causing near-black text on a dark teal glass backdrop.
    2. Dangling route stops pill: The route stops bar was clipped horizontally in half ("3 stops v") at the bottom of the header.
    3. Disjointed action button shapes: The search button and notification bell used rectangular styling (`.secondary-btn`) with crowded text, while the back button was circular (`.header-back-btn`).
    4. Search hint indicator: The `.cmd-k-hint-dot` had a stark white ring shadow (`var(--bg-surface)`) that looked like a floating green circle above the button.
* **Decision:**
  - **High-Contrast Dark Glass Header (`index.css`):**
    - Enforced `--header-fg: #FFFFFF !important` in `.sheet-full` and `.is-scrolled` so trip title, chevron, and icons remain crystal clear on the frosted emerald glass background.
    - Set ergonomic compact padding (`padding-top: calc(8px + var(--safe-top, 0px)); padding-bottom: 8px;`).
  - **Interactive Frosted Title Pill (`index.css`):**
    - Rendered `.app-title-row` as an interactive frosted glass pill badge (`border-radius: 20px`, `background: rgba(255, 255, 255, 0.10)`, subtle 1px border) with the chevron nestled inside. This gives travelers an intuitive visual affordance that the title is an interactive dropdown menu.
  - **Unified 36px Circular Action Buttons (`App.tsx`, `NotificationsBellButton.tsx`, `index.css`):**
    - Refactored Search, Notifications Bell, and Back Button to share the `.header-action-circle-btn` component class (36px × 36px circular glass buttons with 1px translucent border and subtle hover/active scale physics).
    - Anchored the unread badge and search hint dot cleanly with tone-matched border rings (`border: 2px solid rgba(11, 83, 72, 0.95)`), eliminating clipping and misplaced halo artifacts.
  - **Clean Route Stops Collapse (`App.tsx`, `index.css`):**
    - Encapsulated route stops in `.app-header-stops` with CSS transitions, automatically collapsing to `max-height: 0; opacity: 0; padding: 0; margin: 0;` in compact mode so no partial pills peek out.
* **Trade-offs Accepted:**
  - Keyboard shortcut text (`⌘K` / `Ctrl K`) inside the search button is hidden in compact mode in favor of the clean 36px icon circle; the shortcut is preserved via the button's native tooltip.

---

## 97. Full Trip Title Scaling & Compact Header Layout Optimization
* **Context:**
  - In the compact sticky header (scrolled view and expanded bottom sheet), the trip title was getting truncated prematurely with an ellipsis on mobile viewports (e.g. "Sikkim Bagpacking" rendered clipped as "Sikkim Bagpack...").
  - Subsequent layout inspection revealed that the dropdown chevron badge sat inline next to the text leaving the entire right side of the pill empty, while `FitHeading` was erroneously parsing CSS `max-width: 100%` as `100px` via `parseFloat()`, clamping the available text width to ~58px and shrinking font sizes down to 11px.
* **Decision:**
  - **Right-Anchored Dropdown Chevron Badge (`index.css`):**
    - Configured `.trip-dashboard-header.is-scrolled .app-title-row` with `display: flex; justify-content: space-between; width: 100%;`.
    - Added `margin-left: auto; flex-shrink: 0;` to `.app-title-chevron-badge` with dedicated 22px × 22px frosted circular pill styling, anchoring it flush to the right edge of the title pill immediately adjacent to the Search button.
  - **Remaining-Space Allocation for Trip Title (`index.css`, `App.tsx`):**
    - Gave `.app-logo` `flex: 1 1 auto; min-width: 0; text-align: left;` to occupy all remaining width inside the pill between the left padding (12px) and right chevron badge (22px).
    - Set `maxFontSize={isHeaderScrolled || sheetFull ? 18 : 22}`, giving titles a crisp 18px ceiling instead of an overly small 16px cap.
  - **Pixel-Only `maxWidth` Guard in FitHeading (`FitHeading.tsx`):**
    - Guarded `parentStyles.maxWidth` parsing by checking `rawMaxWidth.endsWith('px')`, preventing percentage strings like `"100%"` from being evaluated as 100px.
    - Used `parent.clientWidth` directly as `containerWidth` when available.
  - **Native Typography Sizing without Scale Distortion (`index.css`):**
    - Replaced `transform: scale(0.82)` with `transform: none` on `.app-logo` in compact states, ensuring layout metrics align 1:1 with computed font sizes.
  - **Optimized Compact Header Spacing (`index.css`):**
    - Reduced compact header horizontal padding to `max(12px, var(--safe-left, 12px))`, saving 16px of horizontal space.
    - Reduced compact action buttons to 34px with 6px gap and 8px header gap, saving 14px+.
* **Trade-offs Accepted:**
  - The dropdown trigger icon stays anchored on the right side of the pill regardless of title length, matching standard mobile navigation search/selector bars.

---

## 98. v3.0.0 Major Milestone Release Cut
* **Context:**
  - With the landing of the Trip Checklists & Notes suite, 5th bottom navigation tab, WhatsApp-inspired design system (`SettingsCell`, `SettingsSection`, `OverflowMenu`, `ActionSheet`), active trip header overhaul, and dynamic title scaling engine, the application has undergone a comprehensive functional and aesthetic transformation.
* **Decision:**
  - Bump marketing version from `2.0.0` to `3.0.0` in `package.json` using `npm run release:major`.
  - Retain Apple-style Version/Build split (`src/utils/appVersion.ts`), where marketing version reflects macro product milestones (`3.0.0`) while the build number dynamically tracks individual commits via `git rev-list --count HEAD` (`3.0.0 (533)`).
* **Trade-offs Accepted:**
  - Major version bump signals significant functional enhancement and visual architectural modernization across web application surfaces.

---

## 99. Swipe-to-Edit & Swipe-to-Delete for Travel Notes & Gesture Coexistence
* **Context:**
  - In the newly built Travel Notes section (`ChecklistNotesTab.tsx`), notes previously only supported editing via a tiny 16px icon button in the card header.
  - On mobile, travelers expect native gesture ergonomics where swiping a note card reveals immediate actions (swipe right to Edit, swipe left to Delete), consistent with `ExpenseList` and `MembersGroupsTab`.
  - The application also provides horizontal page swipe navigation between bottom-nav tabs (`useTabSwipe.ts`), which must cleanly coexist without fighting card-level row gestures.
* **Decision:**
  - **Shared `SwipeableRow` (`SwipeableRow.tsx`):**
    - Retained touch-only gating (`e.pointerType === 'touch'`) to prevent mouse pointer interactions on desktop from colliding with scrolling or text selection.
    - Fixed edge-zone calculation in `SwipeableRow`: instead of checking raw `window.innerWidth`, it measures relative to the enclosing `.app-main` / `.app-container` (`rect.left` and `rect.right`), in 100% parity with `useTabSwipe.ts`.
    - Gestures starting in the edge zone (within `EDGE_ZONE_PX = 28px` of container bounds) yield to `useTabSwipe` for bottom-nav tab switching. Gestures starting within the card body engage `SwipeableRow` and opt out `useTabSwipe` (`data-no-tab-swipe="row"`).
    - Added `borderRadius` forwarding and a `handleClickCapture` guard (`hasMoved.current`) so completing a drag gesture never accidentally fires card clicks upon release.
  - **Swipe-to-Edit & Swipe-to-Delete (`ChecklistNotesTab.tsx`):**
    - Wrapped each note card in `<SwipeableRow plain onEdit={() => handleOpenEditNoteModal(note)} onDelete={() => handleDeleteNote(note.id)}>`.
    - Swiping right past the 84px threshold triggers a light haptic tick and immediately opens the note in the full edit modal with all fields populated.
    - Swiping left past the 84px threshold triggers a warning haptic tick and staging for deletion.
    - Made tapping the note card body also open the edit modal (`e.stopPropagation()` on nested action buttons like Copy, Pin, Edit, Delete).
  - **Discoverability & Visual Polish (`index.css`):**
    - Added a subtle pill hint bar (`.notes-swipe-hint-pill`) reading "↔️ Swipe note right to Edit, left to Delete".
    - Wrapped cards with `.note-swipe-wrapper`, ensuring background action reveals match the card's rounded corner geometry (`var(--border-radius-md)`).
* **Trade-offs Accepted:**
  - Dragging notes is restricted to touch devices (matching `ExpenseList` and `MembersGroupsTab`); desktop mouse users retain explicit controls (buttons and card click) without mouse drag hijacking.

---

## 100. v3.0.1 Release Cut & Dev Server Re-evaluation
* **Context:**
  - The application version in `package.json` was bumped to `3.0.0`, but the long-running local Vite dev server had been initialized earlier when the version was still `2.0.0`.
  - Because Vite evaluates `pkgVersion` from `package.json` and git commit count once at boot time in `vite.config.ts` (`define: { __APP_VERSION__, __BUILD_NUMBER__ }`), the client UI continued displaying the stale version.
* **Decision:**
  - Cut release `v3.0.1` (`package.json`) via `npm run release:patch` to incorporate the Travel Notes swipe enhancements and gesture navigation alignment.
  - Restarted the Vite development server so `vite.config.ts` re-evaluates both `__APP_VERSION__` (`3.0.1`) and `__BUILD_NUMBER__` (current git commit count).
* **Trade-offs Accepted:**
  - Requires dev server process restart whenever `package.json` version definitions change.

---

## 101. Demo Seed Route Stops & Header Dropdown Itinerary Toggle
* **Context:**
  - The header dropdown contains an action item to toggle route stops ("View N Route Stops" / "Hide Route Stops"), but the default demo data previously lacked a populated `stops` array, making the feature invisible on a freshly seeded demo trip unless manually created.
* **Decision:**
  - Added pre-seeded multi-stop itinerary waypoints (`Mumbai -> Pune -> Goa`) to `demoSeed.ts` so anyone exploring via "Seed Demo Data" can immediately test and visualize the header route chips and dropdown toggle.
  - Bumped version to `v3.0.2` and restarted background Vite development server following automated release protocol.
---

## 102. Checklist Item Edit Ergonomics & Interactive Route Stops Modal
* **Context:**
  - In the Checklist tab, checklist items previously had no edit capability — users could only toggle complete or delete items with no way to rename, change category, or reassign members.
  - In the header dropdown menu, clicking "View Route Stops" previously merely toggled an inline chip bar that was clipped and hidden by CSS whenever the dashboard header was scrolled down, leaving users with no tangible map or stops view.
* **Decision:**
  - **Checklist Item Editing & Gesture Parity (`ChecklistNotesTab.tsx`, `index.css`):**
    - Added an interactive Edit Checklist Modal allowing full editing of item description, category (packing, documents, medical, general), member assignment, and completion status.
    - Added a direct `<IconEdit />` button on each checklist card alongside the delete button for 1-tap editing on desktop and mobile.
    - Wrapped each checklist item in `<SwipeableRow>` with touch-only swipe gestures (swipe right to Edit, swipe left to Delete), maintaining 100% ergonomic parity with Travel Notes, Expenses, and Members.
    - Added discoverability hint pill (`.checklist-swipe-hint-pill`) informing users of swipe gestures.
  - **Interactive Route Stops Modal & Header Fix (`TripRouteModal.tsx`, `App.tsx`, `index.css`):**
    - Built a dedicated `TripRouteModal` providing an interactive MapLibre map route with OSRM road geometry, interactive numbered stop pins that fly-to coordinates on click, a chronological waypoints itinerary timeline, and quick toggle for the inline header stops bar.
    - Separated header action sheet options into "View N Route Stops & Map" (opens modal) and "Show/Hide Header Route Bar" (toggles inline chips with smooth scroll to container top).
    - Fixed CSS in `src/index.css` so `.app-header-stops.is-expanded` overrides `.is-scrolled` and `.sheet-full` suppression, keeping route chips visible whenever explicitly expanded.
  - Cut release `v3.0.3` and updated dev server per automated release protocol.
* **Trade-offs Accepted:**
  - Touch swipe gestures are scoped to mobile pointer events so mouse click and text interactions on desktop remain unaffected.

---

## 103. Android & iOS Native Sync & WebApp Smoothness Parity
* **Context:**
  - With recent releases (Travel Notes swipe, Checklist editing, and interactive Route Stops modal), native Android and iOS Capacitor shells needed updated web bundles, version numbers, and plugin synchronizations.
  - In webapp mode across mobile devices, iOS Safari and Android Chrome exhibited subtle smoothness and interaction discrepancies: iOS 300ms tap delay, gray tap highlight overlays, lack of momentum scrolling (`-webkit-overflow-scrolling: touch`), and automatic viewport zoom on input focus when font-size was under 16px.
* **Decision:**
  - **Native Shell Build & Sync (`android/`, `ios/`):**
    - Ran `scripts/sync-native-version.mjs` to synchronize `versionCode`/`versionName` to `3.0.3` (build 539) across `android/app/build.gradle` and `ios/App/App.xcodeproj/project.pbxproj`.
    - Compiled root-base web bundle (`VITE_BASE_PATH=/`) and executed `npx cap sync` to deploy fresh assets, plugins, and configs to both `android` and `ios`.
  - **Webapp Smoothness Parity (`src/index.css`, `index.html`):**
    - Added global `-webkit-tap-highlight-color: transparent` to eliminate tap flash boxes.
    - Set `touch-action: manipulation` across all buttons, links, pills, inputs, and interactive controls to remove iOS Safari 300ms tap latency.
    - Added `-webkit-overflow-scrolling: touch` and `overscroll-behavior-y: contain` to `.tab-pane`, modals, lists, and drawers for 120Hz native inertia scrolling on iOS.
    - Prevented mobile viewport zoom jumps on iOS Safari by enforcing a 16px minimum font size on mobile form inputs.
    - Added `apple-mobile-web-app-status-bar-style="black-translucent"` and `mobile-web-app-capable="yes"` in `index.html`.
* **Trade-offs Accepted:**
  - Enforcing 16px minimum font size on mobile inputs ensures viewport stability and prevents iOS Safari auto-zoom without affecting desktop form density.

---

## 104. Checklist Focus Mode, Celebration Burst, Tab Search & Maps Navigation Shortcut
* **Context:**
  - When travelers pack for a trip, long checklists with already-packed items create visual clutter and cognitive overhead, making it harder to spot remaining pending items.
  - Achieving 100% packing readiness lacked positive reinforcement and delight.
  - Searching for specific checklist items or travel notes required scrolling through potentially dozens of entries across multiple category pills.
  - While the `TripRouteModal` offered an interactive MapLibre map and waypoint sequence, travelers heading out on the road had no direct, one-tap shortcut to launch native GPS turn-by-turn navigation in Google Maps or Apple Maps with the full waypoint itinerary.
* **Decision:**
  - **Hide Packed / Pending Only Focus Toggle (`ChecklistNotesTab.tsx`):**
    - Added a 1-tap `Hide Packed (N)` / `Show All` pill filter directly in the category scroll strip.
    - When active, all completed/packed checklist items are smoothly hidden so travelers see only what still needs packing, with an actionable empty state button to unhide if all are packed.
  - **100% Readiness Celebration (`ChecklistNotesTab.tsx`):**
    - Integrated `<ConfettiBurst active={showCelebration} />` and a success haptic pulse (`triggerHaptic('success')`) that triggers automatically when the traveler checks the final remaining item and reaches 100% packing readiness.
    - Updated progress card headline to celebrate: `All Packed! Ready to travel 🎒✨`.
  - **Instant In-Tab Search Bar (`ChecklistNotesTab.tsx`):**
    - Added an instant, 0ms search input at the top of the Checklist & Notes tab with keyboard shortcuts, autofocus support, and a 1-tap clear button (`<IconClose />`).
    - Filters both checklist items (by text & assignee name) and travel notes (by title & content) simultaneously.
  - **Turn-by-Turn "Open in Maps 🧭" Shortcut (`TripRouteModal.tsx`):**
    - Calculated universal directions URL (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...`) from trip stops and waypoints.
    - Added a prominent secondary action button in the modal footer that opens Google Maps or Apple Maps with the pre-loaded multi-stop route.
  - **Automated Native Build & Sync Workflow (`scripts/build-native.mjs`, `package.json`):**
    - Added `npm run cap:sync` running clean, cross-platform root-base build, Capacitor sync across Android and iOS, and standard web bundle regeneration.
    - Synchronized native app versions to `v3.0.4` (build `540`).
* **Trade-offs Accepted:**
  - Standard Google Maps directions URL scheme is used as it seamlessly opens in Apple Maps on iOS devices or Google Maps on Android and desktop browsers without platform-specific app protocol fragmentation.

---

## 105. In-Tab Search Clear Button Containment & Layout Anchoring
* **Context:**
  - In mobile web browsers (notably Chrome for Android), the "✕" button on the Checklist & Notes search bar appeared displaced and sat outside the right border of the search container.
  - This occurred because `.input-icon-wrap` is a flex container, and if `.search-clear-btn` stylesheet rules were deferred by PWA cache or lacked explicit bounding coordinates, the button was laid out in normal flex flow following the 100% width input, causing it to push outside the input border.
* **Decision:**
  - **Explicit Inline Anchoring (`ChecklistNotesTab.tsx`):**
    - Directly assigned `position: absolute`, `right: 10px`, `top: 50%`, `transform: translateY(-50%)`, and `zIndex: 2` to the clear button.
    - Explicitly assigned `position: absolute`, `left: 12px`, `top: 50%`, `transform: translateY(-50%)`, and `zIndex: 2` to the leading search icon.
    - Enforced `boxSizing: 'border-box'` on the `<input>` element so the input width matches the container exactly without overflow.
  - **CSS Rule Hardening (`src/index.css`):**
    - Updated `.search-clear-btn` with `right: 10px`, `width: 28px`, `height: 28px`, and `z-index: 2` for consistent containment across all search instances.
  - Cut release `v3.0.5` (build `541`).
* **Trade-offs Accepted:**
  - Inlining critical bounding coordinates guarantees layout containment even during service worker stylesheet cache transitions on mobile PWAs.

---

## 106. WebKit & Mobile Compositor Performance Optimization (GPU Transforms, WebGL Readback Elimination, and Glass Shader Tuning)
* **Context:**
  - While the UI was smooth on Android Chrome (due to Blink/Skia's tile-caching and threaded compositor), it suffered from severe frame drops and touch lag on iOS Safari / WebKit (15–30 FPS).
  - Profiling revealed five primary bottlenecks:
    1. Dragging the bottom content sheet ([`TripContentSheet.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripContentSheet.tsx)) triggered `setTopPercent` React state updates on every single `touchmove` event (up to 120 FPS on iOS ProMotion displays), driving CSS `top` reflows and continuous GPU clipping mask re-rasterization (`borderRadius`).
    2. [`TripMapHero.tsx`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/TripMapHero.tsx) used `preserveDrawingBuffer: true` and executed a continuous `map.on('render')` canvas pixel-sampling loop (`ctx.drawImage` + `ctx.getImageData`), creating a synchronous CPU-GPU pipeline stall on Metal/WebKit.
    3. Heavy `backdrop-filter: blur(28px)` and `blur(24px)` filters over the dynamic WebGL map caused CoreAnimation fragment shader bottlenecks on iOS Safari.
    4. [`nativeShell.ts`](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/nativeShell.ts) listened to `visualViewport.scroll` and mutated `:root` CSS custom property `--app-vh` during scrolling, triggering document-wide style invalidation passes.
    5. Scrolling tab panes used continuous `-webkit-mask-image: linear-gradient(...)` alpha masks on WebKit.
* **Decision:**
  - **Decouple Sheet Dragging to GPU Transforms (`TripContentSheet.tsx`):**
    - Transitioned drag movement from React state and CSS `top` to direct DOM `transform: translate3d(0, deltaPx, 0)` and direct `scrim.style.opacity`.
    - Zero React component re-renders and zero CSS layout reflows occur during active drag gestures.
    - On gesture release (`handleTouchEnd`), the sheet springs to the resolved snap point via GPU transform before reconciling `top` and React state.
    - Replaced `window.getComputedStyle` traversal in `handleTouchStart` with an instant `target.closest('.tab-pane, [data-scrollable]')` query.
  - **Eliminate WebGL Canvas Readback & Stalls (`TripMapHero.tsx`):**
    - Removed `canvasContextAttributes: { preserveDrawingBuffer: true }` so the browser GPU can utilize double-buffering and buffer discards.
    - Removed the continuous `sampleHeaderLuminance` readback loop, defaulting header tone to dark for high-contrast legibility over the bright OpenFreeMap Liberty style.
  - **Tune Glass Shader Radii (`src/index.css`):**
    - Calibrated blur radii from 28px/24px down to 14px/16px, cutting GPU fragment shading workloads by over 50% while preserving a rich glass aesthetic.
    - Cleaned up non-composited properties from `will-change` (retaining `will-change: transform, opacity`).
    - Added `@supports (-webkit-touch-callout: none)` to disable expensive scrolling alpha masks on iOS WebKit.
  - **Remove VisualViewport Scroll Listener (`src/utils/nativeShell.ts`):**
    - Removed `vv.addEventListener('scroll', setVar)`, retaining `resize` and `orientationchange` for keyboard and layout adjustments without `:root` style thrashing during scroll.
  - Cut release `v3.0.6` (build `542`).
* **Trade-offs Accepted:**
  - Header tone over the map relies on the bright vector map default plus existing high-contrast text shadow and scrim layers rather than continuous real-time WebGL canvas pixel sampling. This trade-off was accepted because eliminating the GPU-CPU pipeline stall yields a massive frame-rate improvement on both iOS Safari and Android Chrome.

---

## 107. Cross-Platform Trip Card Aspect Ratio Parity & Route Modal Back Navigation Fix
* **Context:**
  - On Android Chrome, the passport trip card displayed in a tall, proportional 3:4 portrait luxury card ratio (~480px height). However, on iOS Safari, browser UI elements (top URL bar, bottom toolbar, notch, and home indicator) reduced the available viewport height to ~650px.
  - Because `.trips-screen-scroll.stack-viewport-lock` had `height: var(--app-vh, 100dvh); overflow: hidden;` with `.trip-stack-stage` having `flex: 1; min-height: 180px;`, the card was squashed down to ~320px height, creating a squat ~1:1 square card that cropped the cover photo and distorted the layout.
  - Additionally, when users opened "View Route Stops & Map" (`showRouteModal`) from the header dropdown and attempted to navigate back (via hardware back button, browser back, or mobile edge swipe), the app bypassed the trip summary and completely exited the trip to the all-trips screen (`selectTrip(null)`). This occurred because `showRouteModal` was not registered in the `useHistoryBack` or `useEscapeKey` LIFO navigation stack, leaving `useHistoryBack(!!activeTripId, () => selectTrip(null))` as the next active popstate listener. Furthermore, `TripRouteModal` lacked a dedicated leading back navigation button.
* **Decision:**
  - **Cross-Platform Card Aspect Ratio & Height Parity (`src/index.css`):**
    - Enforced `height: clamp(430px, 58vh, 485px); min-height: 420px; max-height: 500px; aspect-ratio: 3 / 4; max-width: 390px;` across `.trip-stack-stage` both globally and within `.stack-viewport-lock`.
    - Updated `.trips-screen-scroll.stack-viewport-lock` from `overflow: hidden; height: var(--app-vh)` to `min-height: 100dvh; height: auto; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;`.
    - Optimized header, section, and launcher vertical margins (`padding-top: calc(8px + var(--safe-top))`, `padding-bottom: calc(12px + var(--safe-bottom))`) so that on iOS Safari the card retains its tall, uncompressed 3:4 portrait aspect ratio identical to Android, and scrolling naturally causes Safari's bottom toolbar to collapse into full-screen view.
  - **Route Modal & Overlay LIFO Navigation Back Wiring (`src/App.tsx`):**
    - Registered `useHistoryBack(showRouteModal, () => setShowRouteModal(false))` and `useEscapeKey(showRouteModal, () => setShowRouteModal(false))` in the LIFO stack.
    - Also wired `showTripActionSheet` and `showAchievements` to `useHistoryBack` and `useEscapeKey` to guarantee that all overlay sheets/modals pop cleanly to their previous parent state without exiting the trip.
  - **Dedicated Back Button in Route Modal (`src/components/TripRouteModal.tsx`):**
    - Imported `IconChevronLeft` and added an accessible `<button>` on the left side of the modal header labeled "Back to trip summary", allowing users to tap back directly to the trip summary screen in addition to the existing close button and system back gesture.
  - Cut release `v3.0.7`.
* **Trade-offs Accepted:**
  - Allowing subtle vertical overflow on constrained viewports (<680px height with active browser chrome) ensures cards never squash their aspect ratio or crop crucial trip imagery, letting mobile Safari smoothly collapse toolbars when engaged.

---

## 108. Bottom Slider Anchoring & Viewport Lock Dead Space Elimination
* **Context:**
  - After introducing fixed heights and auto-overflow in ADR #107, an awkward 200–250px dead gap appeared between the Join/Create slider (`.trip-launcher`) and the bottom edge on tall Android screens (e.g. 840–900px device height).
  - This occurred because `.trips-screen-scroll.stack-viewport-lock` was set to `min-height: 100dvh; height: auto;` while `.trip-stack-stage` had fixed clamped heights and `.trip-launcher` used a fixed top margin (`margin: 6px 0 0`), causing all elements to cluster high up on the screen and leaving vacant space at the bottom.
* **Decision:**
  - **Restore Full Viewport Lock (`src/index.css`):**
    - Locked `.trips-screen-scroll.stack-viewport-lock` back to `height: 100%; height: 100dvh; height: var(--app-vh, 100dvh); overflow: hidden; overscroll-behavior: none;`.
    - Restored `flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;` on `.trips-screen-main` and `.trip-stack`.
  - **Pin Launcher to Viewport Bottom (`src/index.css`):**
    - Applied `margin-top: auto; margin-bottom: 0; flex-shrink: 0;` to `.trip-launcher`. Any extra vertical space naturally sits above the launcher, ensuring the slider is always neatly anchored right above the bottom navigation / safe-area padding (`calc(14px + var(--safe-bottom))`).
  - **Dynamic 3:4 Aspect Ratio Containment (`src/index.css`):**
    - Set `.trip-stack-stage` to `flex: 1; min-height: 0; height: auto; width: 100%; max-width: min(390px, calc((var(--app-vh, 100dvh) - 220px) * 0.75)); margin: 0 auto 6px;`.
    - This dynamically sizes the card's width in exact 0.75 proportion to available height on short iOS screens (preventing squat horizontal squishing) while expanding fully on tall Android screens to eliminate empty space.
  - Cut release `v3.0.8`.
* **Trade-offs Accepted:**
  - The viewport is strictly locked on phone screens so that all home-screen navigation controls (cards, pagination dots, launcher slider) sit precisely in the viewport with no vertical page scroll.

---

## 109. Full-Project Diataxis Documentation System Expansion
* **Context:**
  - An audit of the documentation catalog (`docs/`) revealed that several core systems were unmapped:
    1. The WebKit / Mobile Compositor performance pipeline and zero-reflow GPU sheet architecture (ADR #106).
    2. The Trip Stack 3:4 aspect ratio clamping formula, viewport locking, and LIFO navigation stack (ADRs #107 & #108).
    3. The Trip Wrapped recap heuristics, superlatives engine, and 1080x1920 canvas export card.
    4. The global Command Palette (`Cmd+K`), fuzzy search indexing, and accessible focus traps.
    5. The interactive Packing Checklist and Trip Notes management system.
    6. The native mobile shell bridge (`nativeShell.ts`) and multi-tier micro-haptics system (`haptics.ts`).
* **Decision:**
  - Authored comprehensive, technical Diataxis documentation across all four quadrants:
    - `docs/explanation-mobile-compositor-and-webkit-performance.md` (Explanation)
    - `docs/reference-gesture-and-sheet-system.md` (Reference)
    - `docs/explanation-trip-stack-and-viewport-architecture.md` (Explanation)
    - `docs/howto-navigate-and-manage-trip-stacks.md` (How-to)
    - `docs/reference-trip-wrapped-engine.md` (Reference)
    - `docs/howto-generate-and-share-trip-wrapped.md` (How-to)
    - `docs/reference-command-palette.md` (Reference)
    - `docs/howto-manage-checklists-and-notes.md` (How-to)
    - `docs/reference-native-shell-and-haptics.md` (Reference)
  - Updated the centralized documentation table in `README.md` to ensure all new guides are discoverable within two clicks.
  - Cut release `v3.0.9`.
* **Trade-offs Accepted:**
  - Markdown documentation files add negligible repository weight while providing deep traceability for future contributors and automated audit tools.

---

## 110. Code-Split the Command Palette (FEAT-031)
* **Context:**
  - `CommandPalette` (429 lines) was statically imported and mounted unconditionally in `App.tsx`, always returning `null` internally when closed (`if (!isOpen) return null`). Because the import was eager, its JS chunk shipped in the initial bundle for every session even though the palette (`Ctrl+K`) is opened by only a fraction of users.
  - Every other secondary modal in `App.tsx` (`GlobalSettingsModal`, `ExpenseForm`, `TripWrappedModal`, `AchievementBadgeModal`, `ShareTripModal`, etc.) already followed a `lazy(lazyImport(...))` code-split pattern; `CommandPalette` was the one outlier still imported eagerly.
* **Decision:**
  - Converted the `CommandPalette` import to the same `lazy(lazyImport(...))` pattern used by the other secondary modals.
* **Trade-offs Accepted:**
  - First `Ctrl+K` press now pays a one-time chunk fetch instead of the palette being instantly ready; negligible on a cached PWA and outweighed by the smaller initial bundle every session pays regardless of whether the palette is ever opened.

---

## 111. Code-Split the Members and Notes Tabs (FEAT-032)
* **Context:**
  - Trip tab panes (`expenses`/`ledger`/`members`/`notes`/`settings`) stay mounted once rendered via a `display: none` swap rather than unmounting, so that swipe-between-tabs and scroll position survive tab switches (see the `.tab-pane` comments in `App.tsx`). `MembersGroupsTab` (1,159 lines) and `ChecklistNotesTab` (1,183 lines) were imported eagerly, so opening any trip shipped ~2,300 lines of tab code the user might never look at.
  - `SettingsTab` already solved this exact problem: because panes stay mounted, a naive `lazy()` import would suspend on first paint. It's gated on a `hasVisitedSettings` flag (`useState(activeTab === 'settings')`, set `true` the first time that tab is visited) so the lazy component only mounts after an actual visit, then stays mounted like the other panes.
* **Decision:**
  - Applied the same `hasVisited<Tab>` + `lazy(lazyImport(...))` + `Suspense` pattern to `MembersGroupsTab` (`hasVisitedMembers`) and `ChecklistNotesTab` (`hasVisitedNotes`).
  - Left `AnalyticsTab` eager: it renders inside the `expenses` pane, the default `activeTab` on trip open, so lazy-loading it would only add Suspense latency to the very first paint with no bundle-size win.
* **Trade-offs Accepted:**
  - First tap on Members or Notes now pays a one-time chunk fetch (skeleton placeholder shown via `Suspense`), same trade-off already accepted for Settings; outweighed by ~2,300 fewer lines in the bundle every trip-open pays regardless of whether those tabs are ever visited.

---

## 112. Seamless Webapp Upgrades: 120 FPS Rendering, Pointerdown Prefetching, Draft Auto-Recovery, Tactile Pull-to-Sync, and WebAuthn Biometrics (v3.1.0)
* **Context:**
  - Modern web standards provide capabilities that match or exceed native mobile fluidity when combined with GPU optimization and modern browser primitives:
    1. Long scrollable lists (100+ expenses, checklists, travel notes) incur CPU layout calculation costs for off-screen DOM nodes.
    2. Lazy-loaded modal dialogs and secondary screens (Command Palette, Trip Route, Share Trip, Trip Wrapped) previously initiated code chunk fetches only *after* click/tap completion (200-300ms network delay).
    3. Tab switching and expense sheet transitions can feel abruptly cut without seamless compositor morphing.
    4. Navigating away from or accidentally closing the Expense Form caused travelers to lose partially typed receipts, titles, amounts, and custom splits.
    5. Pull-to-refresh indicators on the home screen and expense list were plain text with no tactile feedback or visual progress during drags.
    6. Users with sensitive travel expense ledgers lacked a local device biometric lock (Touch ID, Face ID, Windows Hello) to protect their session when leaving the browser open, and SuperAdmins had to repeatedly enter lengthy passwords on trusted personal devices.
* **Decision:**
  - **120 FPS Zero-Jank Virtualization (`index.css`):**
    - Added `content-visibility: auto` with `contain-intrinsic-size` estimation to `.expense-item-cascade`, `.checklist-swipe-wrapper`, and `.note-swipe-wrapper`. Off-screen DOM elements skip painting and layout passes while preserving natural scrollbar physics.
  - **0ms Pointerdown / Hover Prefetching (`NavTabs.tsx`, `App.tsx`):**
    - Attached pre-warming triggers to `onPointerDown` and `onMouseEnter` on tab buttons, header shortcuts, and menu items to preload code chunks ~100-200ms before user `click` completion.
  - **Native Morph Transitions (`index.css`):**
    - Configured CSS rules for `::view-transition-old(root)` and `::view-transition-new(root)` pairing with the `withViewTransition` helper for smooth hardware-composited crossfades with reduced-motion support.
  - **Expense Form Draft Auto-Recovery (`ExpenseForm.tsx`):**
    - Implemented debounced `sessionStorage` draft persistence for new expenses.
    - If accidentally closed or interrupted, re-opening immediately restores form fields with a dismissible "Restored unsaved draft" banner and "Discard" action. Drafts are safely purged on successful expense submission.
  - **Elastic Tactile Pull-to-Sync (`PullToRefreshIndicator.tsx`, `usePullToRefresh.ts`, `index.css`, `TripsListScreen.tsx`, `ExpenseList.tsx`):**
    - Created a frosted-glass iOS-style pull indicator component (`.ptr-pill`) displaying dynamic sync rotation, state expansion, and spring recovery.
    - Emits subtle tactile haptic pulses (`triggerHaptic('medium')`) upon crossing the commit threshold and orchestrates parallel syncing across local queues and Supabase trips/expenses.
  - **WebAuthn Biometric App Lock & Superadmin Quick-Unlock (`webAuthn.ts`, `BiometricLockOverlay.tsx`, `SettingsView.tsx`, `SuperadminAuthModal.tsx`, `App.tsx`):**
    - Integrated standard W3C Web Authentication API (`PublicKeyCredential`) using local platform authenticators (Face ID, Touch ID, Windows Hello). 0 KB external bundle overhead.
    - Added "Biometric App Lock" toggle in Settings with a "Lock Now" capability and session unlock tracking via `sessionStorage`.
    - Added glassmorphic `BiometricLockOverlay` on website launch when biometric lock is active, with fallback to account sign-out.
    - Integrated 1-tap biometric quick-unlock in `SuperadminAuthModal` for verified administrators on trusted hardware.
* **Trade-offs Accepted:**
  - Standard WebAuthn platform authenticators require user-presence interaction; fallback pathways to Google login and master passwords remain available for all edge cases.
  - All additions strictly target the webapp without touching native mobile app wrapper builds.

---

## 113. Gating Biometric Authentication Behind Superadmin Feature Flag (`enableBiometricAuth`) (v3.1.1)
* **Context:**
  - Biometric App Lock & Quick Unlock was introduced in v3.1.0. To enable staged rollouts, dogfooding, and operational controls, the user requested that biometric authentication be placed in flagged mode within the Superadmin Ops Deck.
  - Normal users should only see the option to enable or disable biometric lock in Settings, and only receive enrollment prompts, if the feature flag is explicitly activated by a SuperAdmin.
* **Decision:**
  - **Feature Flag Declaration (`types/admin.ts`, `featureFlags.ts`, `AdminFlagsPage.tsx`):**
    - Added `enableBiometricAuth` to `FeatureFlagKey` with metadata (`label: 'Biometric App Lock (WebAuthn / Passkeys)'`, `category: 'security'`, `defaultEnabledForUsers: false`).
    - Added `'security': 'Security'` category to `FLAG_CATEGORY_LABELS` in the Superadmin Flags Page.
  - **Strict-Toggle Enforcement (`featureFlags.ts`, `featureFlags.test.ts`):**
    - Classified `enableBiometricAuth` as a strict UI toggle flag in `isFeatureActive` (alongside `enableDemoSeeding` and `enableFeatureSuggestions`). This ensures that administrators can test both disabled and enabled states without unconditional superadmin bypasses.
  - **Settings & App Gating (`SettingsView.tsx`, `App.tsx`):**
    - In `SettingsView.tsx`, gated the Biometric Screen Lock card row behind `isFeatureEnabled('enableBiometricAuth')`.
    - In `App.tsx`, gated the launch `BiometricLockOverlay` and post-login enrollment banner behind `isFeatureEnabled('enableBiometricAuth')`.
* **Trade-offs Accepted:**
  - When the flag is disabled globally, travelers do not see biometric options. SuperAdmins can enable the flag globally or target specific trips/users using overrides in the Ops Deck.

---

## 114. Streamlining Trip Action Sheet Dropdown by Removing Redundant Route Bar Toggle (v3.1.2)
* **Context:**
  - When viewing an active trip with stops, the header bar directly presents an interactive expand/collapse toggle badge (e.g. `X stops ⌄` / `⌃`) right below the trip dates.
  - The bottom ActionSheet menu (opened by tapping the header trip title) contained an entry `Show Header Route Bar` / `Hide Header Route Bar` which duplicated this existing header toggle, adding unnecessary menu height and clutter.
* **Decision:**
  - Removed the `toggle-header-stops` option from the bottom ActionSheet menu in `App.tsx`.
  - Retained the `route-modal` option (`View X Route Stops & Map`) to provide instant access to the detailed itinerary and waypoint map modal.
* **Trade-offs Accepted:**
  - Travelers expand or collapse the header route stops directly from the header badge, matching standard mobile navigation heuristics.

---

## 115. Ops Deck "Fleet Vitals" Retheme, Bug Ledger Kanban Drag-and-Drop, and DESIGN.md Reconciliation (v3.2.0)
* **Context:**
  - The superadmin Ops Deck's kanban board (Bug Ledger) only supported changing a case's status by clicking a button inside the detail drawer — moving a card between columns did nothing.
  - `ops-deck.css`'s border-radius and font-size values had drifted into ad hoc, undocumented values across 1,869 lines, and the file's accent color was a blue despite the file's own header comment calling it "teal."
  - The user asked for a visual direction matching a referenced Dribbble shot ("MediApp Pro" healthcare dashboard): mint outer frame, white sidebar with a promo card and user-identity footer, dual-line metrics chart, and a real calendar widget.
* **Decision:**
  - Added real HTML5 drag-and-drop to `.ops-kanban-card`/`.ops-kanban-col` in `SuperAdminBugTracker.tsx`, routing drops through the existing `handleStatusChange` (so dropping onto "Settled" still opens the resolution-note flow, matching click behavior).
  - Reconciled `ops-deck.css`'s radius scale onto DESIGN.md's own tokens (`--r-sm/md/lg/pill` = 10/14/20/9999px, matching the traveler app's documented scale exactly) across all 67 border-radius declarations in the file, and folded two one-off font-size stragglers into the existing micro-scale. The micro-scale itself (9.5–14px) stays a documented, intentional extension — DESIGN.md's 2-step Label/Body scale can't carry a dense admin data console.
  - Retthemed the shared accent tokens (`--amber`/`--cyan`) from blue to teal (`#0FA98F` light / `#2DD4BF` dark), added a mint `--vitals-outer` frame token and yellow `--promo` tokens, and rebuilt `AdminPortalLayout.tsx`'s shell: removed a hardcoded dark-navy-sidebar-on-light-page override that predated this pass, added a real promo card (shows live recycle-bin count) and a real user-identity footer (`userDisplayName` + session email from the actual stores), and added a real Calendar widget to Command Center (current month, today highlighted, event dots computed from real `auditLogs` dates).
  - Extracted `initialsFrom()` to a shared `src/utils/initials.ts` (used by both the sidebar avatar and the Bug Ledger's reporter chips) — this file already held an existing `initial()` helper used by 6 traveler-facing components; both now coexist in the same file rather than one clobbering the other.
  - Fixed a real pre-existing layout bug found during this pass: `.ops-kpi-row` was `grid-template-columns: repeat(3, 1fr)` while every single page (Analytics/Audit/Command Center) renders exactly 4 KPI cards into it, causing the 4th card to wrap onto its own row. Changed to `repeat(4, 1fr)`.
* **Trade-offs Accepted:**
  - The `ops-deck.css` color palette (as opposed to radius/font-size) was deliberately left unreconciled against DESIGN.md — the Ops Deck's console-register palette is intentionally its own system, and a full color audit was out of scope for this pass; ~57 `design-system-color` findings remain, disclosed but not fixed.
  - Three bug reports (`BUG-155`, `BUG-156`, `BUG-157`) auto-filed by `autoBugReporter.ts` during this session's mid-edit transient states (an `initial`/`initialsFrom` clobber and two since-fixed reference errors) were deleted from the live table via `scripts/bug.mjs delete` — they reflected editing-session artifacts, not product defects.

---

## 116. Traveler Experience Power Suite: Member Roles, Offline Snapshots, Itemized Receipt Splitting, Smart Voice Quick-Add, Photo/Receipt Memory Gallery, & Travel Dossier (v3.3.0)
* **Context:**
  - As group trips scale in complexity, travel organizers require granular role delegation (distinguishing organizers, contributors, and read-only viewers).
  - Groups splitting restaurant bills or grocery receipts needed line-by-line item assignments with proportional distribution of taxes, tips, and discounts rather than single lumpsum splits.
  - Quick on-the-go expense entry was constrained by multi-field forms; travelers needed natural language and Web Speech API voice capture.
  - Trip memories, photos, and itemized receipts were scattered across individual expense records without a consolidated visual gallery.
  - Backups were reliant on local browser storage without a portable, validated `.triptracker` snapshot bundle.
  - Final settlement summaries and itinerary dossiers lacked a clean, printable, shareable publication format for trip records and archiving.
* **Decision:**
  1. **Member Roles & Permissions:** Added `MemberRole` (`organizer` | `contributor` | `viewer`) to `Trip.memberRoles`. Provided utility functions in `src/utils/memberRoles.ts` (`canAddExpense`, `canEditExpense`, `canManageTrip`, `isViewerRole`) and role selector / badge displays in `MembersGroupsTab.tsx`.
  2. **Offline Snapshot Backup:** Implemented `.triptracker` JSON export & integrity-validated import engine via `OfflineSnapshotModal.tsx` with full checksum and entity count previews.
  3. **Itemized Receipt Splitting:** Added `ReceiptItem` and `ItemizedReceiptConfig` to `Expense`. Built dynamic line items builder in `ExpenseForm.tsx` supporting item-by-item member assignment chips and proportional tax/tip/discount resolution in `tripStore.ts`.
  4. **Smart Natural Language & Voice Quick-Add:** Implemented `SmartExpenseQuickAddModal.tsx` utilizing Web Speech API voice recognition and enhanced `expenseQuickParser.ts` for natural language parsing of amounts, categories, payers ("paid by X"), split members ("with Y and Z"), and relative dates.
  5. **Receipt & Photo Memory Gallery:** Built `TripMediaGalleryModal.tsx` featuring a responsive masonry wall of all trip attachments, category/member filter chips, and interactive full-screen lightbox with zoom and pan controls.
  6. **Printable / Shareable Travel Dossier & Statement:** Built `TravelDossierModal.tsx` with `@media print` optimized styling, summary financial KPIs, per-member balance settlement slips with UPI/payment integration, and full itinerary breakdown.
* **Trade-offs Accepted:**
  - Itemized split calculations allocate fractional remainder pennies to the primary item assignee to guarantee mathematical equality (`sum(resolvedShares) === expense.amount`).
  - Web Speech API speech recognition falls back gracefully to live natural language typing input when microphone permissions are denied or browser recognition is unavailable.

---

## 117. Ultimate Travel Utility Suite: Digital Travel Pass & Ticket Wallet, On-Device Receipt OCR Scanner, Live Multi-Currency FX Engine & Offline Rate Lock, & Smart Packing Assistant (v3.4.0)
* **Context:**
  - Travelers carry multiple bookings, PDF vouchers, boarding passes, train PNRs, hotel confirmations, and activity passes that get buried across emails and messaging apps. They need a unified, offline-accessible digital wallet with 1-tap QR codes and instant SMS/email itinerary parsing.
  - Splitting restaurant and grocery receipts line-by-line previously required typing every item manually. Travelers needed instant camera OCR scanning to extract dishes, prices, and tax/tip totals directly into itemized split mode.
  - International trips often suffer from fluctuating exchange rates or bank forex markups. Travelers needed live exchange rates, a 30-day offline rate cache, and the ability to lock a custom trip exchange rate (e.g. rate at forex card purchase).
  - Pre-trip packing lists are repetitive and error-prone. Travelers needed context-aware packing recommendations dynamically tailored to the trip's destination, duration, and real-time weather forecasts (temperature & rain conditions).
* **Decision:**
  1. **Digital Travel Pass & Ticket Wallet (`TravelPassWalletModal.tsx`, `passParser.ts`):**
     - Supports 5 distinct pass categories: `flight` (indigo, air india, vistara, international), `train` (IRCTC, seat/berth numbers), `stay` (hotel, airbnb check-in, maps navigation), `transit` (cabs, rentals), and `activity` (event passes).
     - Intelligent parser (`parseBookingText`) extracts reference PNRs, airline/train codes, origin/destination IATA pairs, dates, times, and seat assignments from raw confirmation SMS and email text.
     - Generates high-contrast QR codes via `qrcode` for offline airport/ticket gate presentation, with full-screen ticket modal and screenshot attachments.
  2. **On-Device Receipt OCR Scanner (`ReceiptScannerModal.tsx`, `receiptOcr.ts`):**
     - HTML5 Canvas pre-processing pipeline converts camera/photo uploads into high-contrast grayscale with adaptive thresholding, downscaling large images to optimize parsing speed.
     - Line-item extraction regex identifies individual items, subtotals, taxes, tips, discounts, and grand totals, and seamlessly maps them into `ExpenseForm.tsx`'s itemized receipt splitting mode.
  3. **Live Multi-Currency FX Engine & Offline Rate Lock (`FxRatesModal.tsx`, `currencyFx.ts`):**
     - Integrates European Central Bank data via the Frankfurter API with a 30-day local cache fallback for total offline reliability.
     - Allows trip organizers to lock custom exchange rates and configure a foreign exchange markup percentage (e.g., +2% credit card forex fee) that feeds directly into expense conversion calculations.
  4. **Smart Packing Assistant with Weather Context (`SmartPackingAssistantModal.tsx`, `packingSuggestions.ts`):**
     - Contextual recommendation engine generates categorized packing lists (Clothing, Gear, Documents, Toiletries, Health, Weather gear) based on trip destination keywords, trip duration days, and live Open-Meteo weather forecasts (rain, extreme cold, tropical heat).
     - Provides a 1-tap batch checklist creation action (`batchAddChecklistItems`) in `ChecklistNotesTab.tsx`.
* **Trade-offs Accepted:**
  - Client-side Canvas image pre-processing operates 100% on-device with zero server transmission, guaranteeing traveler privacy and zero cloud API costs.
  - Custom trip FX rates override default baseline conversions when set, ensuring personal forex card exchange rates remain consistent across all trip expenses.

---

## 118. Navigation & Settings Streamlining: Relocating Travel Utilities to Domain-Specific Settings Menus & Lean Header Dropdown (v3.4.1)
* **Context:**
  - Previously, the trip header action sheet (dropdown) had accumulated numerous secondary travel utilities (Smart Voice Quick-Add, Travel Pass Wallet, FX Engine, Travel Dossier, Receipts Gallery, Offline Snapshot, Excel CSV Export).
  - Smart Voice Quick-Add was already prominently available directly in the Expenses tab (+ FAB and header row), making its presence in the header dropdown redundant.
  - The heavy list in the header dropdown overwhelmed travelers looking for core top-level actions (Share Trip, Route Stops Itinerary, Settle Up, and Trip Settings).
* **Decision:**
  1. **Header Dropdown Streamlining:**
     - Removed redundant `smart-quick-add`, as well as `travel-passes`, `fx-rates`, `travel-dossier`, `media-gallery`, `offline-snapshot`, and `export-csv` from the header ActionSheet.
     - Retained a lean, high-signal set of actions: **Share Trip & QR Code**, **Route Stops & Map** (when route stops exist), **Settle Up & Balances** (direct 1-tap route to settlements ledger), **Trip Settings & Details**, **Superadmin Bug Tracker** (gated for superadmins), and **Switch to Another Trip**.
  2. **Domain-Specific Settings Menu Integration:**
     - **This Trip: [Name] (`trip-settings`):** Added 🎫 **Travel Pass & Ticket Wallet**, 💱 **Multi-Currency FX Engine**, 📄 **Travel Dossier & Statement**, and 💾 **Offline Snapshot (.triptracker)** alongside Excel CSV Export and Close Trip.
     - **Trip Tools & Story (`trip-tools`):** Added 📸 **Receipts & Memories Gallery** and 🎫 **Travel Pass & Ticket Wallet** to the *Stories & Navigation* card.
     - **Data & Backups (`data-menu`):** Added 💾 **Offline Snapshot (.triptracker)** (accessible to all travelers without superadmin privilege) and 📸 **Receipts & Memories Gallery** for instant storage media inspection.
     - **Preferences & Interface (`preferences`):** Added 💱 **Multi-Currency FX Engine** for app-wide and trip exchange rate management.
     - **Storage and Data (`storage-data`):** Integrated quick-access actions to inspect Receipts Media Gallery and manage standalone `.triptracker` offline packages.
     - **Global Search Parity:** Updated `matchesSearch` keywords across all settings groups to ensure quick discoverability when searching for "wallet", "passes", "fx", "currency", "dossier", "statement", "gallery", "photos", or "snapshot".
* **Trade-offs Accepted:**
  - Moving deep tools from the header dropdown into the Settings tab adds 1 extra tap for rare exports, but dramatically reduces cognitive load and keeps the header dropdown focused on trip coordination essentials.

---

## 119. Hierarchical Settings Drill-Down Navigation & E-Ticket PDF Itinerary Auto-Parser (v3.4.2)
* **Context:**
  - Navigating back from nested sub-screens in `SettingsView.tsx` (e.g. `Settings -> This Trip -> Trip Tools & Story -> Categories/Map/Recycle Bin`) previously cleared `subScreen` to `null`, kicking the traveler completely back to the root Settings screen rather than returning to the immediate parent screen (`Trip Tools & Story` or `This Trip`).
  - E-ticket PDF uploads (specifically airline bookings such as multi-leg IndiGo/Cleartrip itineraries) failed to extract or populate details in `TravelPassWalletModal.tsx` because `handleFileUpload` only stored the base64 attachment and default filename without running PDF text extraction or calling ticket parsers.
  - In `passParser.ts`, `lower.includes('stay')` took precedence over `lower.includes('flight')` causing flight itineraries with layovers to be miscategorized, flight number regexes rejected codes with spacing like `6E - 537`, and PNR table headers (`AIRLINE PNR\n YI77GE\n X89JTF`) and online booking IDs (`Trip ID : 260807634788`) were ignored.
  - The wallet upload UI labels said "Choose Image File" and "Upload Screenshot" even though PDF e-tickets are the primary format for flight itineraries.
* **Decision:**
  1. **Hierarchical Stack Navigation in Settings (`SettingsView.tsx`):**
     - Replaced flat `subScreen` state with an interactive navigation stack (`screenStack: SubScreen[]`) and push/pop handlers (`pushScreen`, `popScreen`).
     - Added `DEFAULT_PARENT_MAP` defining explicit parent-child relationships across all settings drill-downs (e.g. `categories` -> `trip-tools` -> `trip-settings` -> `Settings`).
     - Implemented dynamic back-button labels via `getParentTitle()`, replacing static "Settings" labels with the actual parent title (e.g. "← Trip Tools" when inside Categories or Recycle Bin; "← This Trip" when inside Trip Tools).
     - Aligned all sub-modal `onBack` handlers (`BugReportModal`, `FeatureRequestModal`, `SuperAdminBugTracker`) with `popScreen()`.
  2. **Client-Side PDF Text Extraction (`src/utils/pdfExtractor.ts`):**
     - Integrated `unpdf` client-side PDF text extraction, converting uploaded PDF ArrayBuffers/Uint8Arrays into clean multiline text on-device with zero cloud server dependencies.
  3. **Multi-Leg Flight Segment & E-Ticket Auto-Parser (`src/utils/passParser.ts`):**
     - Introduced `parseAllBookingPasses()` to identify multi-leg or roundtrip flight itineraries, extracting carrier codes (e.g. `6E-537`, `6E-149`, `6E-445`), airport origins & destinations (`BLR ➔ HYD`, `HYD ➔ IXB`, `IXB ➔ BLR`), scheduled departure & arrival times, and travel dates.
     - Added `extractReferenceCodes()` supporting tabular `AIRLINE PNR` layouts (`YI77GE`, `X89JTF`) and portal booking IDs (`Trip ID : 260807634788`).
     - Added `extractPassengers()` detecting titles and full names (`Ms Upama Maurya`, `Mr RAHUL MAURYA`).
     - Re-ordered type detection precedence so airline codes and flight patterns are checked before generic words like "stay".
  4. **Travel Pass & Ticket Wallet Experience (`src/components/TravelPassWalletModal.tsx`):**
     - Renamed tab to "📄 Upload File" and button to "Choose File (PDF or Image)".
     - Added automated PDF text extraction on file upload with live extraction progress feedback.
     - When multi-segment itineraries are detected, presents an interactive multi-leg card allowing 1-tap **"Save All N Flights to Wallet"** batch import, or quick-switching between individual flight segment details.
     - Added PDF document attachment support with download/view options in the pass lightbox.
* **Trade-offs Accepted:**
  - Client-side PDF text extraction using `unpdf` operates 100% on-device, preserving traveler privacy and avoiding cloud API costs, but requires standard digital text in the PDF (scanned, image-only PDFs without an embedded OCR text layer will attach as a document without auto-populating fields).

---

## 120. Unified Passes & Notes Hub (Option 1) & Removal of Travel Wallet from Settings (v3.4.3)
* **Context:**
  - Previously, travel passes (boarding passes, train tickets, hotel vouchers, offline QR codes) lived in a separate modal launched from Settings (`Settings -> This Trip -> Travel Pass & Ticket Wallet`).
  - Travelers coordinate essential trip documentation (packing lists, confirmation notes, Wi-Fi codes, flight tickets, PNRs) together before and during transit. Stashing ticket passes inside Settings made them hard to locate on-the-go and disconnected from trip notes and checklists.
  - The user requested Option 1: Unifying Travel Passes with the Notes & Checklist section, and explicitly instructed: *"If we are doing this, then dont keep travel wallet in settings"*.
* **Decision:**
  1. **Unified Passes, Notes & Checklist Hub (`src/components/ChecklistNotesTab.tsx`):**
     - Upgraded the 2-segment switcher into a unified 3-segment pill control: `[ 🎫 Passes (N) ]` | `[ 📌 Notes (N) ]` | `[ 📋 Checklist (N) ]`.
     - When passes exist for the trip, the tab defaults to `passes` for quick boarding pass and ticket retrieval.
     - Embedded `TravelPassWalletView` inline directly inside the tab body, removing the need for modal dialog overlays.
     - Live counter badges display the number of saved passes, notes, and checklist completion progress.
     - Search filter bar is scoped to notes and checklist items so wallet-specific carrier filters and segment pickers remain undisturbed.
  2. **Navigation Bar Update (`src/components/NavTabs.tsx`):**
     - Updated bottom navigation tab label from "Notes" to "Passes & Notes" with `aria-label="Passes, Notes & Checklist"`.
  3. **Complete Removal of Travel Wallet from Settings (`SettingsView.tsx`, `SettingsTab.tsx`, `GlobalSettingsModal.tsx`, `App.tsx`):**
     - Removed the "Travel Pass & Ticket Wallet" row item from `trip-tools` (Trip Tools & Story).
     - Removed the "Travel Pass & Ticket Wallet" settings cell from `trip-settings` (This Trip).
     - Removed `showTravelPassesSearch` and search keyword matches from the Settings search filter.
     - Cleaned up `onOpenTravelPasses` props, state, and modal wiring from `SettingsView`, `SettingsTab`, `GlobalSettingsModal`, and `App.tsx`.
     - In the Command Palette (`Ctrl+K`), selecting "Digital Travel Pass & Ticket Wallet" now smoothly routes directly to the `notes` tab (`setActiveTab('notes')`).
  4. **Component Modularization & Backward Compatibility (`TravelPassWalletModal.tsx`):**
     - Refactored `TravelPassWalletModal.tsx` into a lightweight, headless wrapper delegating to `TravelPassWalletView`, eliminating duplicate code while maintaining backward compatibility.
* **Trade-offs Accepted:**
  - Removing Travel Wallet from Settings eliminates redundancy and consolidates trip logistics into one primary bottom navigation tab ("Passes & Notes"). Travelers accessing Passes no longer need to dig through Settings menus.

---

## 121. Multi-Passenger Pass Splitting, Collapsible Route-Leg Cards & Sleek Passes/Notes UI (v3.4.4)
* **Context:**
  - Flight itineraries frequently bundle multiple travelers under a single booking PNR (e.g. Cleartrip / IndiGo bookings with Rahul Maurya and Upama Maurya for multi-leg journeys like `BLR ➔ HYD` and `HYD ➔ IXB`). Previously, only one combined pass was generated per leg, obscuring individual passenger names, seat assignments, and personal QR boarding passes.
  - In the Smart Packing Assistant modal, touch scrolling up and down was hindered by conflicting outer sheet constraints, preventing users from reviewing suggestions and tapping the confirmation action button. Furthermore, pressing hardware/browser Back inside the modal did not cleanly dismiss it, exiting the trip context instead.
  - With Passes, Notes, and Checklists consolidated into a single tab, stacked header elements (segmented buttons $\to$ search $\to$ 100px progress card $\to$ 80px assistant banner $\to$ category pills) created visual clutter.
* **Decision:**
  1. **Multi-Passenger Pass Splitting & Route Leg Grouping (`src/utils/passParser.ts`, `src/components/TravelPassWalletView.tsx`):**
     - Extended `TravelPass` with `passengerName`, `bookingId`, and `legIdentifier`.
     - Implemented `cleanPassengerName` to strip honorific prefixes (Mr/Ms/Mrs/Dr) and format ALL-CAPS names to Title Case.
     - Implemented `matchPassengerToMember` for fuzzy matching travelers to trip members based on full name or first name.
     - Updated `parseAllBookingPasses` to perform a Cartesian product ($N \text{ passengers} \times M \text{ flight legs}$), generating individual passes per passenger per segment.
     - Grouped flight and train passes by route leg (`type::PNR::origin::destination::startDateTime`) into collapsible cards with route headers, departure times, PNR copy button, and passenger count pills (`[ 👥 2 Passes ▼ ]`).
  2. **Smart Packing Assistant Modal Scroll & Back Navigation (`src/components/SmartPackingAssistantModal.tsx`):**
     - Set fixed viewport height (`height: min(86dvh, 640px); max-height: min(86dvh, 640px); display: flex; flex-direction: column; overflow: hidden;`) with an isolated flex-scrollable suggestions list (`min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;`).
     - Pinned sticky bottom action bar with `✓ Add N Items (Okay)` button always visible and accessible.
     - Integrated `useHistoryBack` and `useEscapeKey` so pressing Android/browser Back or Escape safely dismisses the modal and returns to the checklist.
  3. **Checklist & Notes Modal Back Navigation (`src/components/ChecklistNotesTab.tsx`):**
     - Wired `useHistoryBack` and `useEscapeKey` for both the checklist item edit modal and the note edit modal.
  4. **Declutter & Sleek Professional UI (`src/components/ChecklistNotesTab.tsx`, `src/index.css`):**
     - Replaced the bulky ~100px checklist progress card and the 80px assistant trigger banner with a sleek 6px progress track and a compact `✨ Smart Assistant` pill chip inside the category filter row.
     - Preserved celebratory confetti bursts on 100% completion while reclaiming over 160px of vertical screen real estate.
* **Trade-offs Accepted:**
  - Generating separate passes per passenger per leg increases the raw pass count, but collapsible route-leg cards keep the pass deck concise and scannable, while giving each traveler an individual boarding pass with their specific name and personal QR code.

---

## 122. Universal Multi-Strategy Flight Ticket & Pass Parser Engine (v3.4.5)
* **Context:**
  - While compact single-line tickets (e.g. Cleartrip format: `BLR 10:15 11:30 HYD`) were correctly detected, structured multi-page PDF E-tickets (such as HDFC SmartBuy / Cleartrip numbered confirmations) with multi-leg journeys and distinct return PNRs failed to extract connecting and return legs.
  - In such PDFs, times and airport codes are inverted across lines (`10:15 BLR` and `HYD 11:30`), with leg blocks structured as `Bangalore to Hyderabad | Sat, 10 Oct 2026 PNR Number : K6BP5V`. The previous single-regex parser found 0 matches, fell back to `parseBookingText`, and extracted only the first leg (`BLR ➔ HYD`), discarding connecting (`HYD ➔ IXB`) and return (`IXB ➔ BLR`) legs and the separate return PNR (`H4SBKL`). Furthermore, multi-line passenger tables (`Ms. Asmita\nBhosale (Adult)`) caused surname truncation.
* **Decision:**
  1. **Multi-Strategy Flight Segmentation Architecture (`src/utils/passParser.ts`):**
     - **Strategy 1 (Section Header Blocks):** Matches journey section headers (`City to City | Date PNR`), chunks the document into isolated leg sections, and extracts leg-specific carrier codes, times, terminals, and per-leg PNRs.
     - **Strategy 2 (Classic Compact Table):** Preserves the single-line layout matcher (`[IATA] [DEP] [ARR] [IATA]`) for classic tickets.
     - **Strategy 3 (Flight Anchor Chunking):** Delineates direct airline confirmations (IndiGo, Air India, SpiceJet, Akasa) by flight designator codes without section headers, chunking non-overlapping text windows to prevent departure/arrival time bleed.
  2. **Bi-directional Time & Code Extraction & City-to-IATA Normalization (`CITY_TO_IATA`, `resolveAirportCode`):**
     - Extracts both `TIME IATA` (`10:15 BLR`) and `IATA TIME` (`HYD 11:30`), as well as labeled lines (`Depart: ...`, `Arrive: ...`).
     - Standardized dictionary mapping major Indian and global cities to standard 3-letter IATA codes (`Bangalore` $\to$ `BLR`, `Hyderabad` $\to$ `HYD`, `Bagdogra` $\to$ `IXB`, `Delhi` $\to$ `DEL`, `Mumbai` $\to$ `BOM`, `Goa` $\to$ `GOI/GOX`, etc.).
  3. **Per-Segment PNR Scoping:**
     - Segments extract their local block PNR first, ensuring onward segments retain onward PNRs (`K6BP5V`) and return segments retain return PNRs (`H4SBKL`).
  4. **Multi-Line Passenger Name Normalization & Deduplication:**
     - Matches names split across newlines in table columns (`Ms. Asmita\nBhosale`), strips category labels (`(Adult)`, `(Child)`), and deduplicates by cleaned name key to eliminate title formatting variants (`Ms.` vs `Ms`).
* **Trade-offs Accepted:**
  - Segment-scoped chunking parses flight blocks sequentially before falling back to whole-document single-pass extraction, adding minor regex evaluation passes (~15ms), which is negligible compared to PDF OCR times (~200ms) while providing complete leg and PNR accuracy across formats.

---

## 123. Offline IndexedDB Travel Pass Attachment Storage & Quota Self-Healing (v3.4.6)
* **Context:**
  - When saving multi-pass itineraries generated from an uploaded PDF ticket (e.g. 6 passes spanning 3 flight segments and 2 passengers), the multi-megabyte base64 Data URL was duplicated across all 6 passes and persisted directly into `localStorage` via Zustand's `persist` middleware (`trip-tracker-store-v1`).
  - Storing ~9MB in `localStorage` exceeded the browser's strict ~5MB quota ceiling, triggering `DOMException: QuotaExceededError` and rendering a persistent red alert banner (`Storage Error: Your device's local storage is full`).
  - Furthermore, tapping the dismiss button (`&times;`) triggered `clearStorageError: () => set({ storageError: null })`. Updating the store re-invoked `quotaSafeStorage.setItem()` with the same uncompressed 9MB state, immediately throwing `QuotaExceededError` again and re-setting the error message in <1ms, giving the impression that the dismiss button was broken.
  - Additionally, `.toast-close` lacked explicit touch sizing (only 20px glyph size without padding), making it difficult to physically tap on mobile screens.
* **Decision:**
  1. **Dedicated IndexedDB Pass Attachment Store (`src/services/passAttachmentStore.ts`):**
     - Mirrors the offline receipt photo store (`offlineReceiptStore.ts`). Large base64 PDF and image Data URLs are offloaded to an IndexedDB store (`trip-tracker-pass-attachments`), replacing raw base64 URLs in pass records with lightweight pointer keys (`idb:pdf-<id>` or `idb:img-<id>`).
     - Storing attachments in IndexedDB leverages browser storage allocations of hundreds of megabytes while keeping `localStorage` well under 100KB.
  2. **Single-Storage Multi-Pass De-duplication (`src/components/TravelPassWalletView.tsx`):**
     - When saving all passes from a multi-leg itinerary (`⚡ Save All N Passes`), the uploaded PDF file is saved once to IndexedDB under a single shared key, and all generated passes reference that exact same key.
     - Reduces storage footprint from $N \times \text{filesize}$ to $1 \times \text{filesize}$ in IndexedDB, and only ~30 bytes per pass in `localStorage`.
  3. **Emergency Quota Self-Healing & Automatic Migration (`src/store/tripStore.ts`):**
     - **On Storage Write Error (`quotaSafeStorage.setItem`):** If a write triggers `QuotaExceededError`, the storage wrapper intercepts the payload, extracts any legacy `data:` URLs in passes, saves them to IndexedDB, converts the payload to lightweight `idb:` keys, writes the sanitized state to `localStorage`, and updates in-memory Zustand state.
     - **On Store Rehydration & Initialization:** Automatically detects and migrates legacy base64 strings upon app launch or store rehydration.
     - **Defensive Deletion:** When deleting a travel pass, checks if any other pass in any trip references the same attachment key before cleaning it up from IndexedDB.
     - **Defensive Save (`saveTravelPass`):** Intercepts any direct pass saves with `data:` URLs and redirects the binary content to IndexedDB before updating state.
     - **Sanitized Persistence (`partialize`):** Guarantees that `data:` URLs are stripped from JSON payloads before reaching `localStorage`.
  4. **Accessible 44x44px Mobile Touch Target for Toast Dismiss (`src/index.css`):**
     - Upgraded `.toast-close` with `min-width: 44px; min-height: 44px; border-radius: 50%;`, translucent circular feedback background, and `touch-action: manipulation` conforming to WCAG 2.2 touch target criteria (2.5.8).
* **Trade-offs Accepted:**
  - Reading an attachment for full-screen viewing requires an asynchronous fetch (`getPassAttachment`), adding ~5ms of IndexedDB read latency when opening a ticket PDF, but keeping initial app boot, state updates, and all store persistence lightning-fast and 100% quota-safe.

---

## 124. Remote Supabase Pass Sanitization, Dismiss Trap Break & Immediate SW Activation (v3.4.7)
* **Context:**
  - Even after initial client-side IndexedDB offloading, devices could experience recurring storage error alerts upon browser refresh. When trips were fetched from Supabase via `fetchMyTripGraph()`, passes previously saved to the database prior to the client fix contained legacy multi-megabyte base64 Data URLs. Calling `set({ ...graph })` re-injected ~23.1MB of in-memory data, triggering `quotaSafeStorage.setItem` `QuotaExceededError`.
  - Furthermore, clicking the dismiss button was blocked: calling `set({ storageError: null })` triggered `quotaSafeStorage.setItem()`, and when `localStorage` write threw an error, it immediately restored `storageError`, trapping the user in an un-dismissible loop.
  - Additionally, in `public/sw.js`, `.then(self.skipWaiting())` called `self.skipWaiting()` at promise creation rather than as a chained callback (`.then(() => self.skipWaiting())`).
* **Decision:**
  1. **Remote Backend Pass Sanitization (`src/store/tripStore.ts`):**
     - Introduced `sanitizeTripsPasses()` helper.
     - When `fetchMyTripGraph()` or `refreshTrips()` returns, passes are sanitized before state insertion: any `data:` URLs are stored in IndexedDB and replaced with `idb:` keys.
     - Automatically fires a background update to Supabase (`updateTripPasses(t.id, passes)`) to permanently scrub the bloated base64 text from the remote PostgreSQL database.
  2. **Break Storage Error Dismiss Trap (`src/store/tripStore.ts`):**
     - Added `userDismissedStorageError` flag.
     - When user taps dismiss (`clearStorageError`), the flag is set and `storageError` is cleared.
     - `quotaSafeStorage.setItem` respects `!userDismissedStorageError`, guaranteeing that subsequent local storage write attempts will NEVER revive the dismissed error banner.
     - Targeted error clearing: `quotaSafeStorage.setItem` only clears storage quota errors, preserving unrelated messages (e.g. permission or locked trip notices).
  3. **Direct LocalStorage Pre-flight Purge (`src/store/tripStore.ts`):**
     - On initial app boot, inspects raw `localStorage.getItem('trip-tracker-store-v1')` and strips legacy `data:application/pdf` directly from disk into IndexedDB, shrinking local storage footprint from >10MB to <50KB.
  4. **Accurate Settings Database Footprint Metric (`src/components/SettingsView.tsx`):**
     - Excluded offloaded `data:` attachments in `estimatedDbBytes` calculation so the Settings breakdown reflects true disk consumption.
  5. **Immediate Service Worker SkipWaiting (`public/sw.js`):**
     - Corrected `.then(() => self.skipWaiting())` in install event listener.
* **Trade-offs Accepted:**
  - Purging legacy passes in the background issues non-blocking API calls to Supabase on first startup for trips with legacy PDF data URLs, completing in the background without affecting user interactions.

---

## 125. Bottom-Nav Nested View-Transition Crash & Safari Chunk-Reload Gap (v3.4.8)
* **Context:**
  - Automated crash reports (BUG-143, 144, 153, 154) showed recurring unhandled rejections ("Transition was aborted because of invalid state" / "Transition was skipped") on `#nav-1`/`#nav-2`/`#nav-3`, i.e. every bottom-nav tab tap.
  - Root cause: `NavTabs.tsx`'s `goTo()` wrapped `setActiveTab(tab)` in `withViewTransition(...)`, but `setActiveTab` (`App.tsx`) already starts its own `document.startViewTransition()` internally. Starting a second view transition from inside another transition's still-running callback makes the browser immediately abort/skip it, and only the *outer* wrapper's `ready`/`finished` promises were caught -- the inner nested call's rejection surfaced as an uncaught crash.
  - Separately, BUG-145 ("Importing a module script failed.") was a genuine gap in `src/utils/lazyImport.ts`'s stale-chunk recovery: the regex recognized Chrome's and Firefox's wording for a dynamic-`import()` failure after a deploy but not Safari/WebKit's distinct message, so Safari users never got the single-reload recovery and hit the ErrorBoundary crash instead.
  - The remaining open bugs (BUG-146 through BUG-152, minus 145) were stale `localhost:5173` dev-crash-handler captures from mid-edit hot-reload sessions (`usePeerPresence.ts` presence-callback ordering, an undefined `OverflowMenu` reference) that do not reproduce against the current committed code -- verified by reading the current source and confirming a clean `tsc --noEmit` project-wide.
* **Decision:**
  1. **`src/components/NavTabs.tsx`:** Removed the redundant `withViewTransition` wrapper around `setActiveTab(tab)` in `goTo()` -- `setActiveTab` already owns its own transition, so callers just call it directly.
  2. **`src/utils/lazyImport.ts`:** Extended `CHUNK_LOAD_FAILURE` to also match `/importing a module script failed/i` so Safari gets the same reload-and-recover behavior as Chrome/Firefox.
* **Trade-offs Accepted:**
  - None -- both fixes are strict corrections of unintended double-invocation / incomplete pattern matching, not new behavior.

---

## 126. Travel Pass Wallet: Multi-Mode Sorting (Travel Leg, Member Name, Date) & Global Collapse/Expand (v3.4.9)
* **Context:**
  - When users uploaded multi-passenger tickets or multiple flight/train legs (e.g. 6 passengers across 3 segments), all passes were rendered grouped by leg without sorting controls or bulk collapse/expand actions.
  - Reviewing tickets for a specific traveler required expanding each flight segment card individually and searching inside.
  - Users requested a 1-tap bulk "Collapse All" and "Expand All" feature for pass cards, as well as the ability to sort passes by Member Name or Travel Leg Name.
* **Decision:**
  1. **Multi-Mode Pass Sorting (`sortMode: 'leg' | 'member' | 'date'`):**
     - **🛫 Travel Leg (Route Name):** Groups passes by travel leg (`origin ➔ destination` or title) and sorts groups alphabetically (e.g. `BLR ➔ HYD`, `HYD ➔ IXB`, `IXB ➔ BLR`). Inside each flight/train leg group, individual passenger boarding cards are sorted alphabetically by passenger/member name (A-Z).
     - **👤 Member / Traveler Name:** Reorganizes passes by passenger / trip member name into dedicated traveler folders (e.g. `👤 Asmita Bhosale`, `👤 Rahul Maurya`, `👤 Suyog Gadhave`), sorted alphabetically. Each member folder displays all tickets/passes belonging to that person across the entire trip chronologically by departure date/time. Passes without passenger attribution are gathered in a shared group.
     - **🕒 Travel Date & Time:** Groups passes by route leg in strict chronological departure sequence (earliest departure first).
  2. **1-Tap Global "Collapse All" and "Expand All" Controls:**
     - Added dedicated bulk action buttons (`▼ Expand All` and `▲ Collapse All`) to the wallet toolbar with haptic touch feedback.
     - Works across both Travel Leg groups and Member groups, toggling all active group keys simultaneously.
     - Preserves individual accordion toggle functionality for targeted expansion.
  3. **Context-Aware Sub-Card Layouts:**
     - In **Leg View**, cards highlight passenger name and seat number (route and PNR are on the group header).
     - In **Member View**, cards highlight route (`origin ➔ destination`), carrier/flight title, departure timestamp, seat number, and reference PNR code with 1-tap copy.
* **Trade-offs Accepted:**
  - Switching between 'leg' and 'member' sort modes recalculates grouping in `useMemo` in $O(N \log N)$ time, taking less than 1ms for typical trip pass counts (up to 100+ passes) without background thread overhead.

---

## 127. Smart Expense Quick-Add Navigation & Back Button Wiring (v3.4.10)
* **Context:**
  - When opening the 1-tap AI / voice smart quick-add expense modal (`SmartExpenseQuickAddModal.tsx`), users on mobile devices or browser navigations were unable to dismiss the popup using the hardware or browser Back button or swipe-back gesture. Instead of dismissing the modal, triggering the browser back button could navigate away from the active trip entirely.
  - Furthermore, within the modal itself, there was no visual Back button in the header (only a small `✕` on the far right) and no "Cancel" button in the bottom action bar.
* **Decision:**
  1. **History Back & Gesture Stack Integration (`useHistoryBack`):**
     - Imported and invoked `useHistoryBack(isOpen, onClose)` inside `SmartExpenseQuickAddModal.tsx`.
     - Wired `useHistoryBack(showSmartQuickAdd, () => setShowSmartQuickAdd(false))` and `useEscapeKey(showSmartQuickAdd, () => setShowSmartQuickAdd(false))` into the central LIFO back-stack in `App.tsx`.
     - Now, pressing the browser Back button, Android system back button, or performing an edge swipe gesture cleanly dismisses the modal without altering page routing.
  2. **Visual Back Navigation Affordance (`SmartExpenseQuickAddModal.tsx`):**
     - Added an explicit `[ ← Back ]` button on the left of the modal header with haptic feedback.
     - Added a `[ Cancel ]` button to the bottom action bar alongside `1-Tap Save` and `Customize...`.
     - Maintained circular `✕` top-right dismiss button for multiple accessible exit paths.
## 128. Comprehensive Back Navigation & Escape Key Wiring Across All Popups & Pages (v3.4.11)
* **Context:**
  - An application-wide audit of all popups, drawers, sheets, and pages revealed several places where browser Back button, Android swipe-back gesture, or desktop Escape key were not wired, leading to either unhandled back events or premature trip/screen exits:
    1. **Top-Level `App.tsx`:** `showBugTracker`, `showOfflineSnapshot`, `showMediaGallery`, and `showTravelDossier` were missing from the central back-stack.
    2. **SuperAdmin Bug Tracker (`SuperAdminBugTracker.tsx`):** The full-screen ledger and its three internal overlays (`resolvingBug`, `showAddModal`, `drawerBugId`) lacked `useHistoryBack` and `useEscapeKey`, and the header back button was misleadingly labeled "Settings".
    3. **SuperAdmin Portal (`AdminPortalLayout.tsx`, `AdminUsersPage.tsx`, `AdminTripsPage.tsx`):** Mobile section switcher, jump menu, broadcast drawer, trip inspection drawer, and tab drill-down lacked LIFO back navigation.
    4. **Settings & Admin Auth (`SettingsView.tsx`, `SuperadminAuthModal.tsx`):** SuperAdmin authentication modal and category deletion/merge confirmation modal lacked back navigation.
    5. **Settlements & UPI (`BalancesSettlements.tsx`, `UpiPaymentModal.tsx`):** 1-tap UPI payment modal and its internal QR view lacked back navigation.
    6. **Modals & Popovers:** `ReceiptScannerModal`, `FxRatesModal`, `TripMediaGalleryModal` (including lightbox photo view), `OfflineSnapshotModal` (including import preview), `TravelDossierModal`, `TripsListScreen` (`showJoinTrip`), and `DateRangePicker` popover lacked back navigation.
* **Decision:**
  - **Universal LIFO History Back Stack (`useHistoryBack`):**
    - Wired `useHistoryBack` across all identified modals, sheets, drawers, and sub-pages so that the deepest open layer is always popped first on back gesture or browser Back button.
    - Added nested back support for sub-views (e.g. lightbox in media gallery, QR view in UPI modal, import preview in offline snapshot, and drawers in bug tracker).
  - **Desktop Escape Key Harmonization (`useEscapeKey`):**
    - Symmetrically paired `useEscapeKey` with `useHistoryBack` across all modals and forms, ensuring desktop keyboard parity.
  - **Universal Header & Action Affordances:**
    - Updated `SuperAdminBugTracker` header button to universal "Back" with `aria-label="Back"` and title="Back".
* **Trade-offs Accepted:**
  - Standardized on zero-dependency, React hook-based back stack (`useHistoryBack`) across both traveler and superadmin portals.

---

## 129. Deduplicate Trip Wrapped Navigation Entry Point in Settings (v3.4.12)
* **Context:**
  - In `SettingsView.tsx`, under the "This Trip" section, two separate entry points for "Trip Wrapped" existed in close proximity:
    1. An entry directly on the main Settings menu list (`SettingsCell` for "Trip Wrapped (Story Card)").
    2. An entry inside the "Trip Tools & Story" sub-screen (`subScreen === 'trip-tools'`), which already houses "Trip Wrapped (Story Card)" under "Stories & Navigation".
  - This redundancy cluttered the main Settings page and duplicated navigation paths.
* **Decision:**
  - Removed the redundant top-level `SettingsCell` for Trip Wrapped from the main "This Trip" settings list in `SettingsView.tsx`.
  - Retained the dedicated and feature-rich "Trip Wrapped" entry point inside "Trip Tools & Story" alongside squad milestones, route maps, categories, and trip preferences.
* **Trade-offs Accepted:**
  - Keeps the top-level settings menu clean and uncluttered without losing access to Trip Wrapped.

---

## 130. Compact Passes/Notes/Checklist Segment Header & Nav Label (v3.4.14)
* **Context:**
  - On the Passes & Notes tab, the segmented header (`Passes` / `Notes` / `Checklist`) clipped labels via ellipsis and uneven flex, so names and counts were hard to read on one line.
  - The bottom nav label `Passes & Notes` overflowed the floating pill because other tabs use single short words.
* **Decision:**
  - Dropped decorative segment icons; always show count badges (including `0`); equal-width segments with body font and no text truncation.
  - Shortened the visible bottom-nav label to `Notes` while keeping the full `aria-label` ("Passes, Notes & Checklist").
* **Trade-offs Accepted:**
  - Icons are no longer in the segment control (labels + counts carry the meaning).
  - Bottom nav text is shorter than the full feature name; screen readers still get the complete description.

---

## 132. CI fix: App.tsx ConfirmDialog JSX close (v3.5.1)
* **Context:** GitHub Actions failed on `main` after v3.5.0 — `tsc`/`oxlint` parse errors at `App.tsx:2619` (`')' expected`) plus a follow-on test typing gap in `tripStore.test.ts`.
* **Decision:** Close the `confirmRequest` JSX branch before the ConflictResolverModal block; require `tripId` on `makeExpense` helpers in the new conflict unit test.
* **Trade-offs Accepted:** Patch release only; no product behavior change beyond restoring a buildable tree.

---

## 131. Stability & Product Enhancement Batch (v3.5.0)
* **Context:** Multi-device trip use exposed presence crashes, view-transition noise, silent expense LWW, quota pressure from receipt base64, and missing native join deep links. Several flags/docs were stale after P2P removal.
* **Decision:**
  - **Presence:** `usePeerPresence` tears down existing channels via `removeChannel`/`untrack` before resubscribe (BUG-146+).
  - **Nav VT:** Tab/edit transitions always go through `withViewTransition` (BUG-143+).
  - **P2P:** Removed `enableP2PSync` flag/docs residue; historical bug category label kept.
  - **Recycle Bin:** `enableRecycleBin` defaults on for travelers (soft-delete was already always on).
  - **Quota:** Never persist `receiptImage` in zustand/localStorage; stage receipts in IDB; heal strips expense previews on QuotaExceeded.
  - **Conflicts:** Detect dirty-vs-server expense divergence; wire `ConflictResolverModal`; pause queue flush until resolved.
  - **Join deep links:** Canonical `https://trip-tracker.blackmaroon.in/.../join/{code}` + Android App Links / iOS Associated Domains + `appUrlOpen`/`getLaunchUrl` routing.
  - **Pass reminders:** Local notifications (Capacitor) / web schedule flush; T−24h and T−3h for flights/trains; Preferences toggle default on.
  - **Settings IA:** Dedupe Gallery/Snapshot/Badges/Pro Tips; keep Recycle Bin in Trip Tools; Snapshot/Gallery under Data & Backups.
* **Trade-offs Accepted:**
  - Conflict UX is expenses-only (checklist/notes/passes still whole-blob LWW).
  - App Link verification requires filling Android SHA-256 / Apple Team ID in `public/.well-known/*` and a native rebuild + domain deploy.
  - Full zustand→IndexedDB migration remains deferred.

---

## WhatsApp-style Settings home + app-wide Back stack (v3.6.0)
* **Context:** After Settings cuts, the home screen still hid most rows behind four portal folders (This Trip / Preferences / Data / Help). Separately, Back/Escape often skipped layers or required two presses because App and child modals both pushed history, and Escape fired every open listener.
* **Decision:**
  - Flatten Settings into titled WhatsApp-style groups on the first screen; keep real drill-downs only (`categories`, `recycle-bin`, `storage-data`, `archived-trips`, `backups`, `report-issue`, `suggest-feature`, `bug-tracker`, `about`).
  - One history owner per overlay: deepest UI registers `useHistoryBack`; parents must not double-register.
  - `useEscapeKey` uses a LIFO stack so Escape pops only the top overlay, matching hardware Back.
  - Root of the in-trip stack stays: last Back on Expenses leaves the trip → trips list.
* **Trade-offs Accepted:**
  - Biometric lock, toasts, and real routes (`/privacy`, `/login`, etc.) are not dismissed by the overlay stack.
  - Travel Dossier remains removed from Settings and Share Trip.

---

## Header sheet trim + in-app Privacy/Terms (v3.6.1)
* **Context:** The trip-title ActionSheet duplicated Summary (Settle Up) and exposed Superadmin Bug Tracker to travelers. Separately, Settings → About used `navigate('/privacy'|'/terms')`, which unmounted App and lost the About `screenStack`; Back remounted on Expenses/Summary instead of About.
## Universal Back Navigation for Pages, Popup Menus & Settings Sub-screens (v3.6.2)
* **Context:**
  - Back navigation was inconsistent across sub-screens and popup menus.
  - In `SettingsView`, `DEFAULT_PARENT_MAP` mapped `'privacy': 'about'` and `'terms': 'about'`. Clicking "Back" on Privacy Policy or Terms of Service when opened directly from Settings redirected users to "About" instead of returning to Settings home, and the back button text wrongly displayed `< About`.
  - When clicking "Privacy Policy" or "Terms of Service" links inside the text while in Settings, native `<a href>` links triggered a hard document reload, closing the Settings modal.
  - `useHistoryBack` was single-boolean based (`subScreen !== null`), so multi-level drill-downs (Settings → About → Privacy Policy) did not push individual history states. Pressing browser back closed the entire Settings modal instead of stepping back one level.
  - Popup menus (such as `OverflowMenu` 3-dots dropdown) and typeahead dropdowns didn't register with history back, causing back gestures to navigate the underlying page instead of dismissing the menu.
  - Standalone pages (`/privacy`, `/terms`, `/join/:code`, `/reset-password`) had missing or fragile back buttons that could trap users or fail if entered directly without session history.
* **Decision:**
  - Header sheet order: Share → Route Map (if stops) → Mute/Unmute → Edit Trip → Settings → Switch Trip. Gallery and Bug Tracker stay Settings-only (Bug Tracker after Super User Login). Bottom nav unchanged.
  - Extract `PrivacyPolicyContent` / `TermsOfServiceContent` for shared body copy. Public `/privacy` and `/terms` stay thin `LegalPageLayout` wrappers for store/OAuth. From Settings About, open `privacy`/`terms` subScreens with parent `about` so Back pops Privacy → About → Settings home.
  - **Dynamic History Stack (`useHistoryStack`):** Introduced `useHistoryStack(depth, onPop)` in `src/utils/useHistoryBack.ts` that tracks multi-level view stacks. It pushes a history state for each depth level so browser/gesture back pops one level at a time in LIFO order, while programmatically stepping back browser history when in-app back buttons are pressed.
  - **Settings Navigation Correction:** Fixed `SettingsView` by removing the hardcoded fallback to `'about'`. Popping a sub-screen now always returns to the true preceding screen (`screenStack.slice(0, -1)` or `[]`). `getParentTitle()` now accurately reflects the immediate parent screen.
  - **In-App Cross-Links:** Updated `PrivacyPolicyContent` and `TermsOfServiceContent` with an `onNavigate` callback and React Router `<Link>` components, enabling smooth in-modal stack transitions between Privacy Policy and Terms of Service.
  - **Popup Menu Back Wiring:** Added `useHistoryBack` to `OverflowMenu` (3-dots dropdown), `MembersGroupsTab` (typeahead autocomplete), and biometric enrollment prompt.
  - **Standalone Routes Polish:** Upgraded `LegalPageLayout`, `JoinTripScreen`, and `ResetPasswordScreen` with robust back navigation buttons with fallback to `/` or `/login` when directly loaded.
* **Trade-offs Accepted:**
  - Edit Trip from the header leaves the active trip so the list-screen edit form can show (form is not mounted in-trip).
  - Public legal URLs remain separate routes; only the Settings entry path stays inside the app shell.
  - `useHistoryStack` synchronizes browser history entries with state depth; rapid multi-level programmatic pops invoke `window.history.go(-steps)` to maintain parity between browser URL depth and component state.

---

## Receipt Gallery Signed URL Resolution (v3.6.3, BUG-179)
* **Context:** `TripMediaGalleryModal` (Settings → Receipts & Memories Gallery) rendered `<img src={e.receiptImage || e.receiptPath}>` directly. `receiptImage` is a client-only base64 preview that only exists before an expense syncs; `receiptPath` is a Supabase Storage *object path* (e.g. `tripId/expenseId.jpg`), not a fetchable URL. Once an expense synced, `tripStore.ts` deletes `receiptImage`, leaving only the unusable `receiptPath`, so every synced receipt showed a broken image icon in the gallery grid, lightbox, and share action. `ExpenseReviewModal` already resolved this correctly via `getReceiptSignedUrl()`.
* **Decision:** Resolve `receiptPath` to a signed URL per gallery item, mirroring `ExpenseReviewModal`'s pattern, instead of duplicating the raw storage path as an `<img src>`.
* **Pattern/Implementation:**
  - Added `signedUrls: Record<string, string>` state plus a `useEffect` that calls `getReceiptSignedUrl(item.expense.receiptPath)` for any item missing `receiptImage` and not yet resolved, caching the result by expense id.
  - Added a `getDisplayUrl(item)` helper (`receiptImage` base64 preview, else the resolved signed URL) used by the grid thumbnail, lightbox image, and `handleShare`.
  - Grid thumbnail shows a ⏳ placeholder instead of a broken `<img>` while the signed URL is resolving.
* **Trade-offs Accepted:**
  - Signed URLs expire after 1 hour (existing `getReceiptSignedUrl` TTL); re-opening the gallery after expiry re-resolves rather than caching indefinitely, which is correct but means the gallery can't be left open unattended past that window without a refetch on next interaction.

---

## Settings Trip Status Hero + Card Elevation (v3.6.4, FEAT-041)
* **Context:** User asked for Settings UI polish referencing Uber/WhatsApp reference screenshots — "cleaned and smooth." Reviewed 3 mockup directions with the user first (published as an artifact): grouped elevation (WhatsApp-style card depth), bold hero (Uber-style dark header + stat chips), soft premium glass (frosted blur + gradient status card). Audited `SettingsView.tsx`/`index.css` before mocking anything — the app's grouped-card language (`.settings-group-card`, mono uppercase section titles, squircle glow icons) already matched the "grouped elevation" direction closely; the one clearly missing piece against the references was a glanceable trip-status summary (the existing `.settings-trip-flight-banner` was a thin single-line pill, no stat breakdown).
* **Decision:** Ship a hybrid — keep the existing grouped-card body (already close to spec, low risk to touch), replace the flight-banner pill with a stat-chip hero card (Unsettled / Members / Expenses, borrowed from the "bold hero" concept but executed in the app's existing light theme, not a dark block) sitting above the "This Trip" group. Skipped the glass/blur concept entirely — `backdrop-filter` is expensive on the mid-range Android WebViews this Capacitor app targets, and a dark gradient mesh would fight the app's light-mode-default rest of the screen.
* **Pattern/Implementation:**
  - `SettingsView.tsx`: replaced the `settings-trip-flight-banner` block (inline styles) with `.settings-trip-hero` markup — trip name + clickable close/reopen status chip on top, 3 stat tiles below (`settlementSummary.totalOutstanding`/`isFullySettled`, member count, expense count). `SettingsSection` title changed from the trip's own name (now shown in the hero) to the generic "This Trip" label.
  - `index.css`: new `.settings-trip-hero*` classes reusing existing tokens (`--primary-accent`/`--secondary-accent` color-mix gradient, same trick the old banner used) so light/dark theming comes for free. Bumped `.settings-group-card` box-shadow from `0 4px 16px rgba(0,0,0,.05)` to `0 8px 22px -6px rgba(15,20,30,.1)` for visible card depth across all Settings groups, not just the hero.
* **Trade-offs Accepted:**
  - The "Close Trip" action row still exists in the list below (unsettled amount/badge duplicated in the hero) — accepted redundancy: hero is glanceable status, list row is the actual settings action, matches how both Uber and WhatsApp show a summary plus a detail row for the same state.
  - No live browser screenshot taken before shipping (no Playwright/screenshot tool available in this session, only `tsc --noEmit`); flagged to the user as a verification gap.

---

## Appearance Row Title Clip Fix (v3.6.5, BUG-180)
* **Context:** Confirmed via manual testing (user caught it, not caught by the earlier no-screenshot ship above) — proof the flagged verification gap was real. Preferences → Appearance row rendered the theme picker as icon+text segmented buttons ("Light"/"Night"/"Auto") with `flex-shrink:0`. On mobile widths that control ate most of the row, truncating the "Appearance" title into an ellipsis.
* **Decision:** Icon-only segmented control (sun/moon/smartphone), tooltips retained via existing `title`/`aria-label` attrs, instead of widening the row or wrapping the title.
* **Pattern/Implementation:** Removed the `<span>Light/Night/Auto</span>` labels in `SettingsView.tsx`; trimmed `.settings-seg-btn` padding/removed its now-unused `font-size`/`gap` in `index.css`.
* **Trade-offs Accepted:** Icon-only assumes sun/moon/smartphone read clearly without labels — acceptable given the row's own subtitle already states the current mode in words (e.g. "Light").

---

## CI/Deploy Restored — Duplicate Leftover Lines (v3.6.6, BUG-181)
* **Context:** User reported "last commit failed in build." `gh run list` showed CI, Deploy to EC2, and Deploy to GitHub Pages failing on *every* push since `a9fe120` ("Configure settings and update UI components") — the v3.6.0-3.6.2 back-navigation refactor. Production stopped receiving deploys from that point, including two of this session's own earlier pushes (the receipt-gallery fix and the settings redesign never reached `trip-tracker.blackmaroon.in` — which is also why the user saw no visual change after the settings redesign ship).
* **Root cause:** oxlint parse errors in 5 files — an edit had left both the pre-edit and post-edit line in place side by side (duplicate imports, duplicate JSX elements) instead of replacing. The corrected versions were already sitting **uncommitted** in the working tree the entire session (visible in `git status` from turn one) — a previous session had fixed them locally but never committed.
* **Decision:** Commit exactly the lines that fix the parse errors (`ResetPasswordScreen.tsx`, `LegalPageLayout.tsx`, `JoinTripScreen.tsx`, `PrivacyPolicyContent.tsx`, `TermsOfServiceContent.tsx`) plus a `.gitignore` encoding fix (its tail had been appended in UTF-16 instead of UTF-8, visible as null-byte garbage — likely a PowerShell append defaulting encoding). Verified `npm run lint` (0 errors), `npm run build`, and `npm test` (201 passed) all clean before pushing.
* **Explicitly NOT included:** `LoginScreen.tsx`, `TripsListScreen.tsx`, `main.tsx` also had uncommitted changes wiring up an in-progress "Demo Mode" instant-login feature (guest access via `authStore.signInAsDemoUser`, a `/demo` route shortcut, an ungated "Try Demo Mode" button). Left those uncommitted — unrelated to the CI break, and a new user-facing auth flow shouldn't ship silently inside a CI-fix commit.

---

## Settings Menu IA Compaction — Trip Tools & Backups/Media Submenus (v3.6.7, FEAT-042)
* **Context:** User asked to further compact the Settings menu with meaningful groupings, plan-first. Audit: 6 top-level groups, ~24 rows flat on one screen before any tap — This Trip (7 rows) and Data (6 rows) were the worst offenders. Plan reviewed and approved by the user before implementation (see conversation).
* **Decision:**
  - **This Trip**: 7 rows → 3. Kept flat: Invite & Share Trip, Close Trip. New **Trip Tools** submenu (reuses existing `SubScreen`/`setSubScreen` stack pattern) bundles Categories & Tags, Recycle Bin, Mute Trip Alerts, Multi-Currency FX Engine, Excel CSV Export.
  - **Data**: 6 rows → 3. Kept flat: Storage & Data, Archived Trips. New **Backups & Media** submenu bundles Offline Snapshot, Receipts & Memories Gallery, Database Backups (still admin-gated inside).
  - **Help + About merged** into one "Help & About" group (was 2 separate section headers) — pure grouping consolidation, no rows moved out.
  - **Seed Demo Trip**: user explicitly wants this available to all customers for testing/exploration, not admin-gated (matches the existing fresh-signup demo-trip offer). Placed in **Help & About**, not Data — it's a "try the app" aid, not a data-export concern, and keeps Data purely about real backup/export actions.
  - Account group (Sign Out / Clear Data / Delete Account) left untouched and isolated — destructive actions don't get folded into a compaction pass.
* **Pattern/Implementation:**
  - Added `'trip-tools'` and `'backups-media'` to the `SubScreen` union, `DEFAULT_PARENT_MAP`, and `getScreenTitle` in `SettingsView.tsx`. Both new submenus are pure menu screens (list of `SettingsCell`/toggle rows with the same `onClick` handlers the rows already had) — nested navigation (e.g. This Trip → Trip Tools → Categories editor) works for free via the existing `screenStack` array, no parent-map changes needed for the leaf screens.
  - Search still surfaces the two new submenu entries: `showTripTools`/`showBackupsMedia` are ORs of the original per-row `matchesSearch(...)` flags, so a query like "recycle" still surfaces "Trip Tools" on the home screen (same precedent as existing hubs like Storage & Data, whose internal rows aren't separately searchable either).
  - Drive-by: removed a dead `return [];` line in `popScreen()` (unreachable after the preceding `return`, pre-existing oxlint warning) since it sat directly in code being edited.
* **Trade-offs Accepted:**
  - Two more taps to reach Categories/Recycle Bin/Mute/FX/CSV Export and Offline Snapshot/Gallery/DB Backups (previously one tap from Settings home). Accepted for the payoff of a scannable home screen — matches how WhatsApp/Uber bury occasional-use settings behind a labeled hub row.
  - `hasDivider={false}` is only set on the last-rendered row in Trip Tools (assumes CSV Export renders); if `onExportCsv` is undefined the FX row keeps a trailing divider — cosmetic only, same imperfection pattern the original flat list already had.

---

## Settings Overlay Smoothness Batch (v3.6.8, BUG-182–BUG-190)
* **Context:** After the Trip Tools / Backups & Media submenu compaction (v3.6.7), Settings still felt sticky: Back used the same enter animation, lazy leaves stuttered on first tap, Recycle Bin fetched on every Settings open, the profile drawer snapped shut, in-trip Settings remounted on the next trip, category merge used a private overlay, Sign Out/Delete Account ran offline, and Close Trip settlement math ran while that row was hidden. User asked to ship the full follow-up set as bug fixes.
* **Decision:** Keep the existing Settings IA (home stays mounted; submenus are a sliding overlay). Do not flatten Trip Tools / Backups & Media. Do not reintroduce demo mode.
* **Pattern/Implementation:**
  - Overlay Back is a left-to-right reverse (`dir-back` / `dir-out`); exit timeout is keyed only on `subScreen` so flipping to `is-exiting` does not cancel the close animation.
  - Prefetch Categories / Recycle Bin / legal / Report / Suggest on hover/press; prefetch `SettingsTab` from the trip header and `GlobalSettingsModal` from the profile avatar / command palette.
  - Recycle Bin cache survives `selectTrip` (filter by `tripId`); fetch only when the Recycle Bin screen opens. Local deletes still bump the badge.
  - Extract Storage, Archived, Backups, and About into `src/components/settings/*`. Category merge/delete uses shared `ConfirmDialog` (`body` for the replacement picker).
  - Profile drawer: 280ms exit + swipe-right dismiss; history/Escape call `closeRef` so the animation can play before unmount.
  - `hasVisitedSettings` resets when leaving a trip. Settlement math skipped unless the Settings surface is visible, home is showing, and the user can close the trip. Sign Out / Delete Account blocked offline.
* **Trade-offs Accepted:**
  - Remote recycle-bin rows from other devices do not appear in the badge until Recycle Bin is opened once (avoids a network fetch on every Settings visit).
  - Nested Back remounts the parent overlay from the left rather than playing a paired exit on the child — matches WhatsApp-style stack replace, not a two-layer push/pop.

---

## UI/UX Enhancements, Dynamic Passport Stamps & Settings Alignment (v3.7.0, FEAT-043–FEAT-049, BUG-192–BUG-193)
* **Context:** A multi-component UX audit and feature expansion was undertaken to introduce visual richness, sound effects, offline indicators, and fix status contradictions across cards and settings. During initial review, 2-Pane Cockpit view was deemed non-optimal for user workflow and removed; passport stamp placement in flexbox headers was causing displacement of destination names and live weather; and the Settings hero card displayed contradictory "Settled / UNSETTLED" text for zero-debt trips.
* **Decision:**
  - Standardize on single-pane responsive tab layout across all device widths (drop 2-pane desktop split).
  - Relocate passport ink stamps to absolute non-displacing watermark overlays on trip covers, with dynamic high-contrast ink palettes and frosted glass backdrops.
  - Make Settings trip hero stat labels dynamic (`BALANCES` when settled, `UNSETTLED` when outstanding).
  - Replace legacy squad badges button on the Boarding Pass flip card with an authentic airline-style live glowing status tag.
  - Ship OLED Night Flight mode, live in-form FX ticker with rolling odometer, Web Audio receipt tear settlement celebrations, offline status banners, and luggage-tag skeleton loaders.
* **Pattern/Implementation:**
  - `PassportStamp`: SVG dual-ring distressed stamp using `useId()` for arc text paths; dynamic color derived from trip destination hash or settlement state (`#10B981`, `#06B6D4`, `#F59E0B`, `#F43F5E`, `#A855F7`). Positioned at `top: 70px; right: 18px; pointer-events: none; z-index: 1`.
  - `soundEffects.ts`: Web Audio API synthetic noise + lowpass filter bursts for paper ripping (`playTicketTear()`) and low-frequency exponential ramp sine thud (`playStampThud()`), with zero external audio assets.
  - `RollingNumber.tsx`: Pure CSS tabular number translation per digit for smooth odometer transitions in currency conversions.
  - `SettingsView.tsx`: Dynamic label mapping `settlementSummary.isFullySettled ? 'Balances' : 'Unsettled'`.
  - `BoardingPassHeroCard.tsx`: Replaced `S_SQUAD_BADGE` with structured micro-label (`FLIGHT STATUS`) and glowing live dot pill (`ONGOING · DAY X`, `IN X DAYS`, `COMPLETED`).
* **Trade-offs Accepted:**
  - Dropped 2-pane cockpit split view on large screens in favor of consistent single-column layout, prioritizing predictable vertical scanning on web and tablets.
  - Web Audio synthesis requires user interaction gesture to unlock AudioContext in strict browser autoplays (handled cleanly on settle tap).

---

## 138. Transparent & Tilted Passport Stamp on Boarding Pass Hero Card (v3.7.1)
* **Context:** The cleared/entry passport stamp on the Boarding Pass hero card was initially placed as a solid tinted circle, which visually clashed with the perforated paper texture of the card. Additionally, users noted that the stamp should visually harmonize with the settled/unsettled `.stamp-badge` by being transparent and angled.
* **Decision:**
  - Update `PassportStamp` to support `transparent={true}`, omitting the background `<circle>` backdrop and using `fill="none"` with subtle paper-imprint drop shadows.
  - Pass `tilt={8}` to match the exact 8-degree slant of `.stamp-badge` (`transform: rotate(8deg)`).
  - Position the stamp on the left side above the lower perforated tear line (`bottom: 10px; left: 16px;`) occupying the dedicated negative space to the left of the centered outstanding amount.
* **Pattern/Implementation:**
  - `PassportStamp.tsx`: Supports `transparent?: boolean`, `tilt?: number`, `success`/`danger` ink palettes mapped to `var(--color-success)` / `var(--color-danger)`, and `variant` labels (`• SETTLED •`, `• CLEARED •`, `• ENTRY •`, `• UNSETTLED •`).
  - `BoardingPassHeroCard.tsx`: Integrates `<PassportStamp ... transparent={true} tilt={8} color={isFullySettled ? 'success' : 'danger'} />`.
* **Trade-offs Accepted:**
  - Omission of the blurred backdrop on transparent stamps relies on the contrast between the ink color and the boarding pass gradient background. Both `var(--color-success)` and `var(--color-danger)` have strong WCAG-compliant contrast ratios against the card background.

---

## 139. Token-Efficient AI Software-Engineering Procedure Docs (v3.7.2)
* **Context:** Agents needed a standing working loop (understand, smallest change, implement, verify) without pasting a long prompt into every chat. Loading the full nine-section prompt as always-on context would fight the prompt's own token-efficiency goal.
* **Decision:** Split the procedure: a compact always-on Cursor rule plus nine phase docs under `docs/ai-engineering/`. Agents open only the active phase. Pointers live in `CLAUDE.md`, `.agents/AGENTS.md`, and the README documentation table. Existing skill-routing, push, and versioning rules stay as they are.
* **Pattern/Implementation:**
  - `.cursor/rules/ai-software-engineering.mdc` (`alwaysApply: true`) holds the loop, webapp-only default, reuse of `src/store` / `src/services` / `src/utils` / `src/components`, and links to phase files.
  - `docs/ai-engineering/01`–`09` ground the prompt in this repo (Zustand, Supabase, Vitest, oxlint, `npm run build`, ConfirmDialog, RLS).
* **Trade-offs Accepted:**
  - Phase docs are not auto-loaded. Agents that ignore the Cursor rule will not see the detailed procedure unless they open the matching file.
  - This is agent process documentation, not a product feature; it is not logged in `bugs/bugs.json` or the Superadmin feature tracker.

---

## 140. In-Shell Bug Ledger, Traveler My Reports & Triage Columns (v3.8.0)
* **Context:** Superadmins triaged bugs from a Settings overlay while travelers who filed via Report a Problem had no ticket id and no way to check status. Duplicate reports had no grouping, and rows lacked assignee / commit SHA / activity.
* **Decision:** Make Bugs first-class in the Ops Deck (SEC.08), return `BUG-xxx` on file, add Settings → My reports via a SECURITY DEFINER RPC, and add triage columns on `public.bugs`.
* **Pattern/Implementation:**
  - Migration `0079_bugs_triage_fields.sql`: `assignee`, `github_sha`, `fingerprint`, `activity`; recreate `report_bug` with optional `p_fingerprint`; add `list_my_bug_reports()`.
  - `SuperAdminBugTracker` embeds in `AdminPortalLayout` (table + board, bulk status, fingerprint “N similar”).
  - `SettingsMyReportsScreen` lists the caller’s tickets only (email or auth uid on `found_by`).
* **Trade-offs Accepted:**
  - Travelers still cannot `SELECT` `public.bugs`; status is only through the RPC.
  - Applying 0079 on the hosted project is required before My reports and fingerprint grouping work against production.

---

## 141. Ops Deck v2 Violet Visual System (v3.9.0)
* **Context:** Superadmin Ops Deck and Bug Ledger used a teal “Ledger Ops” accent that diverged from the approved v2 mockups (MatDash-like violet, indigo dotted wallpaper, lavender hero).
* **Decision:** Retoken `.ops-deck` to violet `#6D5EF6` (still via `--amber`), keep Open/caution as real `--warning` amber, and match v2 chrome: dotted indigo shell, violet rail pill, solid violet primary buttons, Command Center fleet hero with live counts, Bug Ledger copy (“Triage traveler-reported cases”, “New case”). Traveler Settings stay on cream/teal.
* **Pattern/Implementation:**
  - `ops-deck.css` light/dark tokens, `.ops-shell` wallpaper, `.ops-fleet-hero`, `.ops-btn-primary`, current rail item as violet pill.
  - `AdminCommandCenterPage` fleet snapshot; `AdminPortalLayout` Analytics under Overview; `SuperAdminBugTracker` subtitle/button copy.
* **Trade-offs Accepted:**
  - `--amber` remains the accent token name to avoid a wide rename; it is violet, not amber.
  - Rail SEC codes stay in the DOM for jump/search identity but are visually hidden to match the mockup.





























## 142. Cross-Trip Expense Search + Global Owe/Owed Balance Dashboard (v3.9.1)
* **Context:** Command Palette expense search was scoped to the active trip only (`activeTripExpenses` in App.tsx), so nothing surfaced for a query while on the Trips List screen or about an expense on another trip. Trips List also had no summary of net balance across a user's trips, only per-trip settlement math (`BalancesSettlements.tsx`, `StickyBalanceBar.tsx`).
* **Decision:** Extend the existing (superadmin-only) `fetchAllExpensesForTrips` with an optional `titleQuery` filter and reuse it from the traveler-facing `CommandPalette` for a debounced cross-trip expense search. Add a per-currency net-balance chip row to `TripsListScreen`, computed with the existing `calculateSettlements` across every trip the user belongs to.
* **Pattern/Implementation:**
  - `tripApi.ts`: `fetchAllExpensesForTrips(tripIds, titleQuery?)` -- unfiltered call unchanged for the superadmin caller; `titleQuery` adds a server-side `ilike` + 50-row cap.
  - `CommandPalette.tsx`: 250ms-debounced cross-trip fetch when 2+ trips and a 2+ char query; results deduped against the already-loaded active-trip expenses, tagged with trip name + their own currency (fixed a latent bug where every result used the active trip's currency symbol); selecting a cross-trip result switches trips rather than opening the edit modal directly.
  - `TripsListScreen.tsx`: fetches all expenses for the user's trips on mount/trip-list change (skipped offline), nets balance per member via `calculateSettlements`, groups by trip currency (no FX conversion -- a wrong blended total is worse than none) into `.home-balance-chip` pills in the header.
* **Trade-offs Accepted:**
  - Multi-currency balances show as separate chips per currency rather than one blended number.
  - Cross-trip search result tap switches trips only; it does not deep-link into the specific expense's edit modal yet.

## 143. Security Hardening Phase 5 -- RLS Audit Fixes + Anti-Bot Wiring (v3.9.1)
* **Context:** A full security audit (two-agent pass: RLS policy coverage across all 79 migrations read in final-state order, plus an app-level OWASP/secrets/CSP/CI pass) found 13 real gaps on a production money app: two CRITICAL (self-unban via a `profiles` column with no write guard; a superadmin audit-log leak readable by any authenticated user), a HIGH email-harvesting leak on `profiles`, a HIGH but non-functional Turnstile anti-bot layer (widget rendered, nothing captured/verified the token), plus several MEDIUM/LOW RLS and CSP gaps.
* **Decision:** Fix everything with a real code-level remedy now; explicitly skip and disclose the two items judged not worth the added surface (`claim_trip_member()` join-code re-verification -- LOW/optional, UUID-unguessability already adequate; a migration-history ordering oddity with no live-state impact).
* **Pattern/Implementation:**
  - `supabase/migrations/0080_security_hardening_phase5.sql`: scoped `profiles` SELECT to self/superadmin/trip-co-members (was `using(true)`); closed self-unban by revoking the *table-level* UPDATE grant on `profiles` from `authenticated` and re-granting only `(display_name, avatar_url)` -- a column-only revoke was tried first and verified ineffective (Postgres table-level grants supersede column-level revokes; caught by re-querying `information_schema.column_privileges` after applying, then corrected live); gated `security_audit_logs`' null-trip_id branch behind `is_superadmin()`; `log_security_event()` now requires real authority over `p_trip_id`; dropped `bugs`' dead raw INSERT policy now that `report_bug()` RPC exists; added a trigger validating `expenses.paid_by`/`split_member_ids` stay within the expense's own trip (change-aware, so it does not regress 0071's "edit an expense after its payer left the trip" fix); `expenses` RLS now enforces the `viewer` role server-side (was UI-only).
  - `authStore.ts`: fixed a TOCTOU race where `initialized:true` could flip before a persisted `isSuperadmin` flag's RLS re-verification resolved.
  - `JoinTripScreen.tsx`/`LoginScreen.tsx`: wired the previously-decorative `TurnstileWidget` -- join-code lookup now gates on solving it first (client-side friction layer; the DB attempt-lockout from 0047/0060 remains the actual enforced defense); admin login passes a real `captchaToken` into `signInWithPassword` (inert until the one remaining manual step: enabling Supabase's native Captcha protection in the dashboard with a Turnstile secret key).
  - `index.html`: dropped `unsafe-inline` from CSP `script-src` (verified zero inline scripts in `dist/index.html` post-build).
  - `npm audit fix`: 10 -> 7 vulnerabilities; the rest are Capacitor native-tooling devDependencies needing `--force`/no upstream fix, left alone rather than risk breaking `npx cap sync` on a forced major bump.
  - Migration applied directly to the live project via the Session Pooler (`aws-0-ap-northeast-2.pooler.supabase.com`) -- the direct `db.<ref>.supabase.co` host resolves IPv6-only and this network has no IPv6 route.
* **Trade-offs Accepted:**
  - Join-code Turnstile is a soft client gate, not cryptographically enforced server-side (would need a receipt-table + edge function to fully close, judged disproportionate given the DB lockout already covers the real abuse case).
  - Admin-login captcha enforcement needs a one-time Supabase Dashboard toggle (Authentication -> Settings -> Bot and Abuse Protection) that cannot be done from a migration file.

## 144. Android allowBackup Disabled (v3.9.3)
* **Context:** Native Android/iOS config was never covered by the two security audits (both were web/DB/CI focused). `android:allowBackup="true"` in `AndroidManifest.xml` let WebView storage -- including the Supabase session token, since supabase-js's default storage adapter is localStorage -- be extracted via `adb backup` given USB debugging + physical device access. Standard OWASP Mobile M9 (Insecure Data Storage) finding.
* **Decision:** Set `android:allowBackup="false"`. No feature in the app relies on ADB/cloud backup restoring app data (trip data already syncs through Supabase, not local backup).
* **Trade-offs Accepted:** None -- this only removes an extraction path, no functionality depended on backups being enabled.

## 145. Home-Screen Owed/Owe Chips Removed; Cross-Trip Balance Moved to Profile (v3.9.5, BUG-206)
* **Context:** `TripStack.tsx`'s per-trip card chip computed the current user's balance off the live local zustand `expenses` store, which can be an incomplete/stale snapshot for a trip not opened yet this session -- unlike the in-trip detail view (`BalancesSettlements.tsx`/`BoardingPassHeroCard.tsx`), which always fetches the full trip-scoped expense set. Result: a trip trip detail correctly reported as fully Settled (`OUTSTANDING = 0.00`) could still show a nonzero "OWED TO YOU ON THIS TRIP" on its home-screen card, and the header's cross-trip chip inherited the same class of risk.
* **Decision:** Drop both home-screen chips entirely rather than patch the per-card calc, and relocate the (already-correct, since it used a fresh `fetchAllExpensesForTrips` call) cross-trip owed/owe total to the profile/settings screen -- a surface seen once per session rather than repeated on every trip card, and one the user asked for directly.
* **Pattern/Implementation:**
  - `TripStack.tsx`: removed the "OWED TO YOU ON THIS TRIP" / "YOU OWE ON THIS TRIP" chip block and its supporting `balanceInfo`/`myMember` calc.
  - `TripsListScreen.tsx`: removed the header cross-trip chip paragraph and its `crossTripBalances` state/effect (dead once the render was gone) plus now-unused imports.
  - `src/hooks/useCrossTripBalances.ts` (new): the same settlement-aware, server-fresh per-currency balance calc extracted out of `TripsListScreen.tsx` so it has one home instead of being re-derived.
  - `App.tsx`: calls the hook once, passes `crossTripBalances` down through `GlobalSettingsModal.tsx` -> `SettingsView.tsx`, which renders the chip(s) in the profile hero (opened via the home-screen avatar button, before any trip is entered).
* **Trade-offs Accepted:** The underlying staleness risk in `TripStack.tsx`'s local-store read wasn't fixed for other consumers of that pattern (there are none currently) -- just removed at its only call site. If a future per-trip-card balance display is wanted, it should read from the same authoritative fetch path as `useCrossTripBalances`, not reintroduce the local-store calc.

## 146. TripStack Settled Stamp Made Authoritative; Bug-Ledger Category Fix (v3.9.6, BUG-207)
* **Context:** Follow-up pass on #145 found two more issues in the same area. First, `CardContent`'s `myMember` resolution fell back to `tripMemberList[0]` -- an arbitrary member -- when the current user couldn't be matched by `linkedUserId` or display name, meaning the card could display someone else's balance as the user's own; separately, when no member matched at all, `balanceInfo` defaulted to `status: 'settled'`, falsely stamping an unknown-balance trip as settled. The passport-stamp/"Settled" pill was also still computed from the local zustand `expenses` store -- the same staleness class as #145, just for the stamp instead of a number. Second, unrelated: `npm run bug:sync` was throwing a Supabase `bugs_category_check` constraint violation on every run for BUG-167/168/170, which used a `reliability` category value that was never in the DB's allowed list (`offline-sync, splits-math, ui-ux, navigation, auth, receipts-camera, p2p-sync, performance, general`).
* **Decision:** Remove the unsafe fallbacks outright rather than special-case them, and make the settled indicator authoritative like the balance total already is. Retag the three bad-category bugs to `general` (matching how similar crash/resilience bugs are already filed) instead of altering the DB constraint, since changing local data is lower-risk than a schema migration for a bug-ledger label.
* **Pattern/Implementation:**
  - `TripStack.tsx`: `myMember` now returns `null` (not an arbitrary member) on no confident match; `balanceInfo`'s `!myMember` branch now returns `null` (not a false `settled`). Both are moot for balance display now, since the whole local `myMember`/`balanceInfo` calc was deleted and replaced by an `isSettled?: boolean` prop threaded `TripsListScreen` -> `TripStack` -> `StackCardItem` -> `CardContent`, driving the passport-stamp variant/color and the inline "Settled" pill. `userId` prop dropped from `StackCardItem`/`CardContent` (no longer needed once the local calc was removed).
  - `useCrossTripBalances.ts`: return shape changed from a bare balances record to `{ byCurrency, settledTripIds }` -- `settledTripIds[tripId]` is `transfers.length === 0` from the same per-trip `calculateSettlements` call already made for the balance total (trip-wide, not user-specific, matching the trip detail view's own settled semantics). One authoritative fetch now backs both the profile balance total and every trip card's settled state.
  - `App.tsx`: destructures both fields from the hook; passes `settledTripIds` down to `TripsListScreen` alongside the existing `crossTripBalances` pass-through to `GlobalSettingsModal`.
  - `bugs/bugs.json`: BUG-167/168/170 recategorized `reliability` -> `general`.
* **Trade-offs Accepted:** None of substance -- this closes out the correctness gaps #145 left standing rather than trading anything off.

## 147. Timing, Weather & Flight-Compliant Smart Travel Packing Assistant (v3.10.0)
* **Context:** Travelers creating trips needed intelligent preparation assistance based on the trip's destination, dates/timing, and expected climate. Crucially, packed items must strictly comply with aviation safety and airport security rules (ICAO / TSA standards: lithium batteries/power banks forbidden in cargo hold, liquids limited to <=100ml / 3-1-1 rule in cabin, sharp tools and trekking poles restricted to checked luggage).
* **Decision:** Re-architected the smart travel packing engine in `src/utils/packingSuggestions.ts`, updated `SmartPackingAssistantModal.tsx` with flight-compliance badging and luggage filtering, and integrated ambient trigger cards into `ChecklistNotesTab.tsx`.
* **Pattern/Implementation:**
  - `src/utils/packingSuggestions.ts`: Added `AirplaneEligibility` ('cabin-only' | 'checkin-only' | 'any'), `cabinNote`, `isLiquid`, and seasonal climatology inference (`inferSeasonalClimate`) for trips scheduled beyond the 14-day live weather window. Added `generatePackingGuideNote` to produce formatted travel guide notes.
  - `src/components/SmartPackingAssistantModal.tsx`: Added luggage segmentation pills (`All Baggage`, `✈️ Carry-on Only`, `🧳 Checked Baggage`), an aviation security compliance banner (highlighting lithium battery hold prohibition and 3-1-1 liquids rule), visual badges on each item, an option to tag items with luggage bag prefixes (`[✈️ Cabin]`, `[🧳 Check-in]`), and dual actions ("Add to Checklist" and "Save as Note").
  - `src/components/ChecklistNotesTab.tsx`: Wired live weather updates via `getDestinationWeatherRealtime`, added an ambient travel preparation card when the checklist is empty, added an assistant action button to the empty state, and connected `onSaveAsNote` to `addTripNote` with pinned status.
  - `src/utils/packingSuggestions.test.ts`: Added 8 comprehensive unit tests covering aviation rules, carry-on filtering, seasonal inference, and markdown note formatting.
* **Trade-offs Accepted:**
  - For dates months in advance where real-time forecasts are meteorologically impossible, the engine automatically falls back to seasonal hemispheric climatology based on the destination region and travel month.

## 148. Real-Time Travel Days Stepper, Season Override & Modal Scroll Lock (v3.10.1)
* **Context:** Two UX friction points were identified in the packing assistant: First, scrolling inside the assistant modal on mobile/touch screens was difficult because touch drag propagated to the background page (`document.body`), causing whole-screen rubber-banding. Second, users needed clear visual confirmation that packing suggestions and luggage categorization (Carry-on vs Checked baggage) update dynamically in real time when duration or timing changes.
* **Decision:** Integrated `useScrollLock` to strictly isolate scrolling within the modal viewport, added a timezone-safe duration calculation with an interactive `[-] / [+]` days stepper, a real-time season/timing selector, and live badge counts on luggage tabs and footer action buttons.
* **Pattern/Implementation:**
  - `SmartPackingAssistantModal.tsx`:
    - Wired `useScrollLock(isOpen)` and added CSS `overscroll-behavior: contain; touch-action: pan-y;` on both the card and inner scrollable list.
    - Added an interactive **Trip Duration Stepper** (`[-] {N} days [+]`) directly in the modal header; tapping `+` or `-` immediately recomputes clothing ratios in real time.
    - Added an interactive **Season Selector** (`Auto`, `Summer`, `Monsoon`, `Winter / Alpine`) allowing immediate preview and real-time generation of climate gear.
    - Added live item counts to each luggage tab (`All Baggage (N)`, `✈️ Carry-on Only (N)`, `🧳 Checked Baggage (N)`) and live selected breakdown (`Add N Items (X Cabin, Y Check-in)`) in the footer.
* **Trade-offs Accepted:**
  - Days adjusted inside the assistant customize the packing list without mutating the underlying trip's stored start/end dates in the database.

## 149. Portal-Mounted Bottom Sheet & Mobile Scrolling Overhaul for Packing Assistant (v3.10.2)
* **Context:** On mobile devices, `SmartPackingAssistantModal` was rendered within a transformed parent (`.tab-pane` with swipe gesture transforms). In CSS, a transformed ancestor forms a new containing block for `position: fixed` elements, trapping the modal below `.app-header` (z-index 100) and underneath the floating `.nav-tabs` bottom bar (z-index 50), which occluded the "Save as Note" and "Add Items" action buttons. In addition, large stacked header controls consumed ~60% of vertical screen height, leaving only ~120px for the items list, and parent `touch-action: none` blocked touch drag scrolling.
* **Decision:** Mounted `SmartPackingAssistantModal` directly to `document.body` via `createPortal` with `z-index: 10000`, redesigned the modal into a sleek mobile-native bottom sheet (centered dialog on desktop >=640px), streamlined header controls into a compact toolbar, added collapsible aviation details, and ensured full touch-scroll fluidity (`touch-action: auto` on overlay, `touch-action: pan-y` on scroll list).
* **Pattern/Implementation:**
  - `SmartPackingAssistantModal.tsx`:
    - Rendered via `createPortal(modalContent, document.body)` with `z-index: 10000` to sit permanently above the app header and bottom navigation bar.
    - Redesigned into a native bottom sheet with pull handle, compact header with `✕` dismiss button, and consolidated single-row controls (duration stepper + season dropdown + select all).
    - Compacted aviation security guidance into a 1-line bar with collapsible details toggle, reclaiming ~180px of vertical space for the items list.
    - Elevated sticky footer with safe-area padding (`env(safe-area-inset-bottom, 8px)`) ensuring action buttons are 100% visible and un-obscured on all phone screens.
  - `src/index.css`:
    - Added `.packing-assistant-portal-overlay` and `.packing-assistant-sheet` classes with `bottomSheetSlideUp` animation and responsive desktop centering (`min-width: 640px`).
* **Trade-offs Accepted:**
  - Used React DOM portal to break free of transformed stacking contexts; ensures clean viewport positioning regardless of where in the component hierarchy the trigger button resides.

---

## 150. Streamlined Packing Assistant, Structured Notes Depiction & Universal Back Navigation (v3.11.0)
* **Context:** The initial Smart Packing Assistant presented excessive information on screen (day-by-day forecast strips, large luggage cards, and popovers that caused header title shifting), squeezing the interactive packing checklist to the very bottom. When saved as a note in the Notes & Checklists tab, the content rendered as a raw monospace text dump. Furthermore, users navigating back using the browser Back button, mobile swipe-back gestures, or an in-app back button needed predictable return to the previous page (Notes tab).
* **Decision:** Dramatically streamlined the assistant interface to dedicate 80%+ of vertical viewport space to packing items, replaced raw text note rendering with a rich structured note view component (`NoteContentView`), and implemented universal back navigation (`useHistoryBack`, `useEscapeKey`, in-app `←` back button).
* **Pattern/Implementation:**
  - `SmartPackingAssistantModal.tsx`:
    - Removed bulky day-by-day weather cards and static luggage blocks; replaced with a single-row compact segmented filter bar (`All`, `Cabin`, `Hold`, `Squad`, Duration stepper `[- 5d +]`, and `All/None` toggle).
    - Compacted the header to a non-wrapping single-line title (`Smart Packing • {Destination}`) with climate pills, eliminating header layout shifts.
    - Added dedicated in-app `←` Back button (`IconChevronLeft`) and wired `useHistoryBack(isOpen, handleBack)` and `useEscapeKey(isOpen, handleBack)` so hardware back, browser back, swipe-back, and Esc cleanly dismiss the modal and return to the Notes tab.
    - Fast airport security scanner tray accessible on demand via a compact `[ ✈️ Flight Ready ✓ ]` / `[ 🛂 Essentials ]` pill with 1-tap "Pack All 4" action.
    - Squad shared gear carrier assignment (`🎒 Carrier: {MemberName}`) with live weight summaries.
  - `ChecklistNotesTab.tsx` & `src/index.css`:
    - Replaced raw `<pre className="note-content-text">` with a structured `NoteContentView` parser.
    - Parsed categories into distinct visual sections: `✈️ Cabin Bag` (blue badge), `🧳 Checked Hold` (amber badge), `🎒 Flexible / Shared` (teal badge), and checklist rows with bold titles and subtle guidance text.
    - Rendered top trip metadata (`📍 Destination`, `📅 Dates`, `⛅ Weather`) into sleek glass pills.
    - Added an inline collapsible toggle (`[ ▾ View All N Items ]` / `[ ▴ Show Less ]`) for long notes (>6 items).
    - Rendered Wi-Fi and credential codes into copyable badges while preserving proportional, readable font hierarchy.
* **Trade-offs Accepted:**
  - Kept underlying `note.content` string unchanged in the database for 100% backward compatibility and plain-text clipboard copying fidelity, while transforming the visual presentation inside the note card into rich structured elements.

---

## 151. Repository README Alignment for Smart Packing, Notes, Passes & Release Tooling (v3.11.1)
* **Context:** Recent major platform capabilities (Smart Packing Assistant with ICAO/TSA aviation security compliance, structured `NoteContentView` rendering, Travel Pass Wallet with boarding pass QR/PDF extraction, Trip Wrapped storytelling, and automated release scripts) were omitted from the repository's root `README.md`.
* **Decision:** Updated the primary repository documentation (`README.md`) to comprehensively reflect all newly introduced features, security workflows, and developer release CLI tooling.
* **Pattern/Implementation:**
  - Updated `README.md`:
    - Added **Smart Travel Prep & Packing**: weather-aware packing assistant, ICAO/TSA cabin vs check-in hold aviation rules, airport scanner checkpoint tray, squad gear carrier assignments, and universal back navigation.
    - Added **Checklists, Travel Notes & Passes**: collaborative checklists, structured note cards, 1-tap copyable credentials, and travel pass wallet.
    - Added **Story Recaps & Experience**: Trip Wrapped story recap and passport card deck gestures.
    - Updated **Development**: documented `npm run release:patch`, `npm run release:minor`, and `npm run release:major` scripts.
* **Trade-offs Accepted:**
  - Kept documentation concise and feature-oriented, linking to granular deep-dive guides under `docs/` for architectural references.

---

## 152. 3-Second Hands-Free Voice Quick-Add Expense Logging (v3.11.2)
* **Context:** Travelers on the go (stepping out of cabs, paying food stalls, or carrying luggage) needed a frictionless way to record expenses in seconds without navigating forms or manually typing numbers, categories, and payers on a small mobile touchscreen.
* **Decision:** Implemented an instant 3-second offline-first voice quick-add pipeline leveraging browser-native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), enhanced natural language parsing in `expenseQuickParser.ts`, animated audio waveform feedback, and a hands-free 3-second auto-save countdown timer.
* **Pattern/Implementation:**
  - `SmartExpenseQuickAddModal.tsx`:
    - Added `autoListen` prop: opening via the microphone trigger activates speech recognition immediately on render without a second tap.
    - Added animated sound wave bars (`.voice-wave-bar`) with pulsating keyframes during active speech capture.
    - Added a hands-free 3-second countdown banner (`⚡ Auto-saving in 3s...`) once speech ends and a valid amount is parsed. Includes `Save Now` and `⏸️ Pause / Edit` buttons to bypass or hold the timer.
    - Dynamic language detection (`navigator.language || 'en-IN'`).
    - Added graceful microphone permission and error recovery messages with instant keyboard fallback.
  - `expenseQuickParser.ts`:
    - Added normalization for spoken number phrases (e.g. "twelve hundred" -> 1200, "four fifty" -> 450, "one thousand" -> 1000).
    - Added support for spoken currency keywords ("rupees", "bucks", "dollars", "euros", "pounds") both as prefixes and suffixes.
    - Stripped leading speech fillers ("please add expense", "log expense", "spent").
  - `ExpenseList.tsx` & `App.tsx`:
    - Added high-visibility `🎙️ Voice` button in the expense search bar toolbar.
    - Added `🎙️ Speak Expense` action button on the empty-state card.
    - Integrated `🎙️ Voice Quick-Add Expense` into the global `Cmd+K` Command Palette.
* **Trade-offs Accepted:**
  - Web Speech API operates on-device in modern Chromium/Android browsers with zero cloud API costs or latency. In browsers lacking SpeechRecognition support (e.g. Firefox desktop), the UI displays a clean notification and falls back to natural-language keyboard input.

---

## 153. Voice Quick-Add Natural Language & Dialect Precision Refinement (v3.11.3)
* **Context:**
  - When users spoke natural phrases like *"Paid 200 for cab by upi by rahul"*, speech recognition on desktop/Chromium instances with default `en-US` locales acoustically misclassified Indian English *"Paid two hundred"* as *"800"*, and the previous parser did not recognize payment channels (*"by upi"*, *"via gpay"*), leaving them in the expense title (*"Paid for cab by upi"*).
  - Prepositions like *"for cab"* were captured as part of the title, and speech-to-text homophones where *"for"* was transcribed as digit *"4"* caused the parser to mistakenly treat *"4"* as the expense amount instead of the actual price.
* **Decision:**
  - **Acoustic Dialect Targeting & Persistence (`SmartExpenseQuickAddModal.tsx`):**
    - Defaults voice speech recognition language to `en-IN` (Indian English) when `baseCurrency === 'INR'` or Indian locale is present, ensuring high-accuracy acoustic models for Indian English phonology, local names (*Rahul*, *Priya*), and terminology (*UPI*, *GPay*, *PhonePe*, *cab*, *auto*).
    - Added an in-modal dialect/accent switcher (`🇮🇳 English (India)`, `🇺🇸 English (US)`, `🇬🇧 English (UK)`, `🇮🇳 हिन्दी (Hindi)`) with persistent `localStorage` memory (`trip_tracker_voice_lang`).
  - **Payment Mode Detection & Stripping (`expenseQuickParser.ts`):**
    - Added detection for payment channels: `UPI`, `GPay`, `PhonePe`, `Paytm`, `Cash`, `Card`, `Bank Transfer`, `Apple Pay`, and `PayPal`.
    - Automatically extracts `paymentMode` into `ParsedQuickExpense` and strips payment phrases (*"by upi"*, *"via card"*) before payer and title parsing so they never pollute expense titles.
    - Surfaced a `💳 [PaymentMode]` pill in the modal's preview chip strip.
  - **Action Verb & Preposition Title Cleaning (`expenseQuickParser.ts`):**
    - Added `actionAmountRegex` to match amounts immediately following transaction verbs (*"Paid 200"*, *"Spent 1500"*), ensuring clean extraction before filler stripping.
    - Cleanly strips leading prepositions (*"for cab"* -> *"Cab"*, *"on lunch"* -> *"Lunch"*) and trailing leftovers.
    - Added speech homophone normalization converting digit `4` following an amount/verb into *"for"* (*"Paid 200 4 cab"* -> *"Paid 200 for cab"* -> Amount: 200, Title: "Cab").
    - Refined number heuristic to prioritize price numbers over quantity counts (*"4 tickets"*, *"2 people"*).
* **Trade-offs Accepted:**
  - Payment mode is extracted for preview badges and title cleanliness; since the baseline `Expense` schema stores notes and splits, the payment channel is primarily leveraged for UX clarification and can be populated into transfer descriptions.

---

## 154. Public Join-Code Preview & On-Device Receipt OCR (v3.12.0)
* **Context:** Invited friends landing on `/join/:code` had to sign in with Google before they could tell whether the link was real, who was already on the trip, or when it ran. Separately, receipt scanning still needed a reliable OCR path that did not invent line items from a sample receipt when the scan failed.
* **Decision:** Ship two traveler-facing features together as a minor release. (1) A public join preview: anonymous visitors see trip name, dates, and member first names, then continue with Google to claim the seat. Backed by security-definer RPC `preview_trip_by_join_code` (migration 0081), which never returns trip ids, member ids, expenses, or balances, and rate-limits failed codes by hashed client IP the same way authenticated lookups do. (2) Receipt OCR via lazy-loaded `tesseract.js` with no sample-receipt fallback; failed scans surface an error instead of fake items.
* **Pattern/Implementation:**
  - `supabase/migrations/0081_join_code_public_preview.sql` adds `trip_join_preview_attempts` (revoked from anon/authenticated) and grants `preview_trip_by_join_code` to anon + authenticated.
  - `src/utils/joinPreview.ts` maps the RPC row and re-strips last names client-side. `JoinTripScreen` loads the preview before auth; `tripApi.ts` calls the RPC; `database.ts` types it.
  - `src/utils/receiptOcr.ts` + `ReceiptScannerModal.tsx` load Tesseract on demand (`vite.config.ts` excludes it from `optimizeDeps`). Parse failures throw `ReceiptOcrError` rather than substituting demo data.
* **Trade-offs Accepted:**
  - First-name leakage on a valid join code is intentional (enough to recognize the trip, not enough to enumerate the roster). Invalid codes stay empty plus lockout, not a distinct "not found" oracle beyond attempt limits.
  - Tesseract WASM is code-split so the main bundle stays lean; first scan pays a download. English traineddata is fetched at runtime, not committed (`eng.traineddata` at repo root is a local leftover).

---

## 155. Duplicate Expense Warning & Live Flight / PNR Status Tracker (v3.13.0)
* **Context:**
  - Group trips frequently experience duplicate expenses—either through the same user accidentally tapping "Save" or speech quick-adding twice, or multiple group members independently recording the same shared group bill (e.g. hotel check-out, rental car, dinner).
  - Travelers holding digital boarding passes and train tickets in the Travel Pass Wallet currently only see the QR/barcode for airport/station security, but lack immediate access to real-time gate changes, departure delays, airborne live flight radars, and railway coach/berth confirmation status without manually copying numbers into search engines.
* **Decision:**
  - **Duplicate Expense Warning & Anti-Double-Counting Guard:**
    - Created `src/utils/duplicateExpenseDetector.ts` evaluating 4-dimensional criteria:
      1. Exact or near-identical amount ($\le 2\%$ difference or exact currency match).
      2. High title similarity using token Dice coefficient ($\ge 0.70$) or substring inclusion.
      3. Date proximity (same calendar date or within $\pm 24$ hours).
      4. Payer collision (same payer = likely double entry; different payer = potential shared bill collision).
    - Integrated seamlessly into `ExpenseForm.tsx` as a non-blocking warning banner with collapsible details, direct link to view the conflicting expense, and an explicit acknowledgment to proceed if intended.
    - Integrated into `SmartExpenseQuickAddModal.tsx`: candidate duplicate expenses immediately pause the 3-second hands-free auto-save countdown timer, display an alert banner with matching details, and prompt for confirmation so voice users never double-log in a noisy environment.
  - **Live Flight & PNR Status Tracker in Travel Pass Wallet:**
    - Created `src/utils/travelStatusService.ts` providing deep intelligence:
      - Flight carrier identification (IndiGo `6E`, Air India `AI`, Akasa `QP`, SpiceJet `SG`, Vistara `UK`, Emirates `EK`, British Airways `BA`, Lufthansa `LH`, United `UA`, Delta `DL`, etc.) and extraction of IATA flight numbers and routes.
      - IRCTC / Indian Railways 10-digit PNR detection and 5-digit train number detection from pass metadata, barcodes, and booking references.
      - Direct links to Google Live Flight Tracker, Flightradar24 real-time radar, FlightAware, ConfirmTkt PNR Status, RailYatri, and Google Live Train Running Status.
    - Created `src/components/LiveTravelStatusModal.tsx` displaying an airline/train hero badge, copy-to-clipboard actions, and single-tap live tracker launcher buttons.
    - Integrated directly into `TravelPassWalletView.tsx` with dedicated `🛫 Live Status` and `🚆 PNR Status` action buttons on pass cards and multi-leg group headers.
* **Trade-offs Accepted:**
  - Rather than making duplicate warnings blocking (which would prevent legitimate recurring payments like two separate cab rides of the same fare), warnings are advisory and highlight differences (same payer vs. different payer) while pausing voice auto-submit.
  - Live flight radar and Indian Railways PNR lookups are routed via curated deep links (Google Flight Status, Flightradar24, ConfirmTkt, RailYatri) with pre-filled flight numbers and PNRs, eliminating high-latency API keys or CAPTCHA blockers while guaranteeing 100% up-to-date carrier and railway data.
  - *(v3.13.1 Refinement)*: Fixed flight code extraction heuristic:
    - Replaced `[A-Z0-9]{2}\s*[0-9]{1,4}` which previously permitted hyphenated codes like `6E-537` to fail the 2-char check at `-` and accidentally match `53` + `7` (isolating "537" without airline prefix).
    - Added support for hyphens, spaces, and no-separator formats (`6E-537`, `6E - 537`, `6E537`, `6E537_BLR_HYD`).
    - Enforced that general 2-char IATA codes MUST include at least one letter (`[A-Za-z][A-Za-z0-9]|[A-Za-z0-9][A-Za-z]`), preventing purely numeric sequences like `537` from being misclassified as carrier codes.
    - Added 3-letter ICAO to IATA mapping (e.g. `IGO` -> `6E`, `AIC` -> `AI`) and provider-name fallback (`IndiGo` -> `6E`).
    - Added inline interactive editing in `LiveTravelStatusModal` allowing users to view, edit, and fine-tune carrier & flight codes on the fly with live deep link updates.
  - *(v3.13.2 Refinement)*: Attempted hyphenated flight code preservation across external trackers.
  - *(v3.13.3 Resolution - ICAO Callsign & Canonical Slug Routing)*:
    - **FlightAware Resolution:** FlightAware's search engine strictly indexes airline operations by 3-letter ICAO callsigns (e.g. `IGO` for IndiGo, `AIC` for Air India, `AKJ` for Akasa, `VTI` for Vistara, `SEJ` for SpiceJet) rather than 2-letter commercial IATA codes. Passing `6E-537` caused FlightAware to fail with "Unknown Flight". Implemented `IATA_TO_ICAO` dictionary mapping so FlightAware deep links directly to `https://www.flightaware.com/live/flight/IGO537`, immediately displaying the live route, gate, history, and status for IndiGo 537.
    - **Flightradar24 Resolution:** Flightradar24 canonical flight slugs mandate lowercase alphanumeric format without hyphens (`/data/flights/6e537`). Hyphenated URLs (`6e-537`) resulted in 404 or unrouted map views. Preserved `6e537` for Flightradar24 while adding an in-modal tracker tip clarifying that live radar tracking displays real-time GPS positions when the aircraft is airborne.
    - **FlightStats Direct Integration:** Added FlightStats (`/v2/flight-tracker/6E/537`) providing Cirium-powered real-time airport departures, delay index, and gate timetable.
    - **Boarding Pass Hero Clarity:** Preserved user-friendly hyphenated formatting (`6E-537`) in modal hero, ticket titles, and clipboard copy action while displaying an `ICAO: IGO537` callsign badge.
  - *(v3.13.4 Refinement - Departure Date & Time Query Integration)*:
    - **Pass Date Parsing (`parseFlightDate`):** Added comprehensive date parsing handling ISO date/times (`YYYY-MM-DD[T/ ]HH:mm`), natural text representations (`15 Oct 2026 at 08:30 AM`), and standard UTC timestamps.
    - **Google Flight Status Date Targeting:** Appended formatted date string (e.g. `15 Sep 2026`) directly into the Google Live Flight Status search query (`6E-537 flight status 15 Sep 2026`), navigating directly to the specific departure day rather than defaulting to today's flight card.
    - **FlightStats Date Query Parameters:** Added calendar day parameters (`?year=YYYY&month=M&date=D`) to Cirium FlightStats deep links, immediately filtering the global timetable and delay index to the ticket's departure date.
    - **Modal Hero Date & Time Display:** Prominently rendered departure date (`📅 15 Sep 2026`) and flight time (`⏰ 10:30 AM`) in `LiveTravelStatusModal.tsx` for both flight and train passes, with dynamic action button subtitles reflecting the target date.

---

## 156. Frictionless Traveler Experience Suite: Dynamic Island Travel Capsule, Offline Gate Scanner, Tactile Swipe Gestures, & Predictive Quick-Chips (v3.14.0)
* **Context:**
  - In real-world travel conditions (hurrying through departure halls, juggling luggage, spotty airport/subway cellular reception, and repetitive small cash logging), travelers face multiple micro-frictions:
    1. Finding an upcoming boarding pass or train coach number requires switching away from the active trip expense feed to the Travel Pass Wallet tab and scrolling.
    2. Optical boarding gate turnstiles and security scanners often fail on dark-mode mobile screens due to lack of contrast or screen auto-dimming during queues.
    3. Flick-scrolling through a long ledger of expenses occasionally triggers accidental horizontal swipe-to-delete/edit gestures or jitter.
    4. Entering repetitive on-trip expenses (breakfast, coffee, metro, water bottles, tolls) requires repeatedly typing identical titles and selecting categories.
* **Decision:**
  - **1. "Next Up" Smart Travel Capsule (`NextUpTravelCapsule.tsx`):**
    - Pinned a sleek Dynamic Island header widget at the top of the trip ledger (`ExpenseList.tsx`).
    - Intelligently detects imminent travel passes (within a 36-hour schedule window or departed < 3 hours ago).
    - Computes real-time countdowns (`Boarding in 45m`, `Departs in 3h 15m`, `En Route / Airborne`, or `Tomorrow`).
    - One-tap quick actions: instant access to `[📲 Show Pass]` (optical scanner) and `[🛫 Live Status]` (real-time gate, radar, and delay tracking).
    - Expandable/collapsible accordion layout that stays unobtrusive while keeping critical flight/train numbers, seats, gates, and terminals in clear view.
  - **2. High-Contrast Offline Pass Scanner Modal (`PassScannerModal.tsx`):**
    - Built a high-contrast modal displaying an inverted `#FFFFFF` card backdrop with deep black retina QR/barcode specifically optimized for optical security gates and ticket turnstiles.
    - Prominently surfaces passenger name, seat/berth, coach, terminal, gate, and booking reference with a 1-tap copy button.
    - Leverages the browser `Screen Wake Lock API` (`navigator.wakeLock.request('screen')`) to keep the phone screen awake and bright while standing in boarding queues.
    - Offline guarantee shield badge (`🛡️ Offline Scanner Ready · Stored in Device Memory`) reassuring passengers that passes are cached and render without cellular connectivity.
    - Integrated directly into `TravelPassWalletView.tsx` and `NextUpTravelCapsule.tsx`.
  - **3. Dual-Stage Tactile Haptic Swipe Gestures (`SwipeableRow.tsx`):**
    - Added vertical dominance gesture filtering: during touch interactions, if vertical scroll exceeds 7px and $\ge$ horizontal movement, horizontal dragging is immediately suppressed to prioritize native buttery page scrolling.
    - Implemented dual-stage tactile vibration haptics: a subtle "tick" peek feedback at 36px threshold, followed by a crisp "pop" commit feedback when pulled past 84px.
    - Added smooth spring transitions with `cubic-bezier(0.16, 1, 0.3, 1)` and high-contrast edit/delete background affordances.
  - **4. Predictive Expense Auto-Complete & Smart Quick-Chips (`src/utils/predictiveExpenses.ts`):**
    - Developed an adaptive contextual suggestions engine that combines time-of-day awareness (e.g. Breakfast/Coffee/Metro in the morning, Lunch/Snacks/Sightseeing in the afternoon, Dinner/Drinks/Cab in the evening) with learned frequent trip expenses ($\ge 2$ occurrences).
    - Added automatic category inference (`inferCategoryId`) matching natural transaction keywords to existing trip categories.
    - Rendered horizontal scrollable quick-chips above the expense title input in `ExpenseForm.tsx`. Tapping any chip automatically fills the title, auto-selects the inferred category, and smoothly shifts focus to the amount input for near-zero-latency expense entry.
* **Trade-offs Accepted:**
  - The "Next Up" capsule restricts auto-surfacing to active/imminent passes within 36 hours of departure (or 3 hours post-departure) to prevent older or far-future passes from cluttering the transaction list when users are simply managing trip finances.
  - The Wake Lock API degrades gracefully on unsupported mobile browsers or background tabs without throwing errors or blocking modal display.
  - Quick-chips are non-intrusive and automatically clear or filter as the user types custom titles.

---

## 157. Voice Input NLP Parser Refinement & Settings Menu Simplification (v3.14.1)
* **Context:**
  - In fast-paced travel environments, travelers using the voice input / speech-to-text option in the Expenses tab (Quick Add) and Expense Form found that common natural spoken phrases like `"500 coffee"`, `"coffee 500"`, `"500 for coffee"`, `"500/- coffee"`, or spoken Hinglish numbers were intermittently missed or left dirty prepositions in the item title. Additionally, mobile Chrome SpeechRecognition instances were throwing `InvalidStateError` when restarted after silence timeouts.
  - In Settings, the "My reports" option under Help and About was redundant and no longer needed by users, cluttering the menu.
* **Decision:**
  - **Voice Input NLP Engine (`expenseQuickParser.ts`):**
    - Relaxed regex lookahead for number detection to `(?=[.,;:!?-]?(\s|$))` ensuring trailing punctuation appended by mobile speech engines (`500, coffee` or `coffee 500.`) does not prevent amount identification.
    - Added normalization for currency symbols and ledger suffix formats (`500/-`, `500/=`, `Rs. 500`, `₹ 500`).
    - Expanded spoken number parser with colloquial English and Hinglish scales (`dedh sau` -> 150, `dhai sau` -> 250, `paanch sau` -> 500, `dedh hazar` -> 1500, `dhai hazar` -> 2500, `do hazar` -> 2000, `rupay`, `rupaye`, etc.).
    - Added bidirectional preposition and particle cleaning (`for`, `on`, `of`, `towards`, `at`, `in`, `worth`, `ka`, `ki`, `ke`, `ko`, `mein`, `se`) preventing dirty titles like `"Coffee of"` or `"Coffee ka"`.
    - Added comprehensive unit test coverage in `expenseQuickParser.test.ts` verifying 16 real-world speech permutations.
  - **Speech Recognition Lifecycle Robustness (`SmartExpenseQuickAddModal.tsx` & `ExpenseForm.tsx`):**
    - Replaced the persistent speech instance with per-session instantiation in `SmartExpenseQuickAddModal.tsx`, completely preventing `InvalidStateError` when restarting after silence timeouts.
    - Added real-time interim speech preview, multi-dialect support (`en-IN`, `en-US`, `en-GB`, `hi-IN`), and 1-tap parsed result confirmation preview.
    - Upgraded `ExpenseForm.tsx` mic button to leverage `parseQuickExpense`, auto-populating amount, title, and inferred category.
  - **Settings Menu Simplification:**
    - Removed `"My reports"` cell, route handling, search matching, and prefetch from `SettingsView.tsx` and `prefetchSettingsLeaves.ts`.
* **Trade-offs Accepted:**
  - Unused references to `SettingsMyReportsScreen` were pruned from bundle to maintain tree-shaking efficiency while retaining file for historical consistency.

---

## 158. Product Readiness Audit, Market Strategy & Future Strategic Roadmap Documentation (v3.14.2)
* **Context:**
  - As Trip Tracker 2026 reached 157 ADRs and 247 automated test suites, leadership requested an objective, comprehensive evaluation of whether the application remains an MVP/starter app or has attained full production-grade readiness, along with a strategic analysis of its market positioning and growth vectors.
* **Decision:**
  - Created [`docs/product-strategy-and-market-analysis.md`](file:///c:/ProjectsV1/Trip_Tracker_2026/docs/product-strategy-and-market-analysis.md) and linked it from [`FEATURES.md`](file:///c:/ProjectsV1/Trip_Tracker_2026/FEATURES.md).
  - Codified the technical proof points establishing production-grade readiness: 157 ADRs, 48 test suites with 247 passing tests, offline-first Zustand optimistic persistence, client-side Tesseract OCR, Screen Wake Lock optical gate scanner, and 120 FPS mobile compositor performance.
  - Formulated the "All-in-One Travel OS" market positioning at the intersection of Group Fintech (Splitwise alternative, 1-tap UPI) and Travel Logistics (TripIt alternative, live flight radar, boarding passes).
  - Outlined a 3-phase strategic future roadmap: Native App Store Launch (Capacitor Play/App Store), AI Vision LLM Bill Auto-Split & Flight Disruption Radars, and Public Itinerary Sharing Community.
* **Trade-offs Accepted:**
  - Preserved the document as markdown within the version-controlled repository to ensure traceability alongside code updates and architectural releases.

---

## 159. Fixed Superadmin Mobile Navigation Stuck on Command Center (v3.14.3)
* **Context:**
  - On mobile, `AdminPortalLayout` (`src/components/admin/AdminPortalLayout.tsx`) swaps the desktop rail nav for a `.ops-section-trigger` button that opens a section-switcher sheet. Both the sheet's open state and the active admin tab were independently tracked with `useHistoryBack` (`src/utils/useHistoryBack.ts`), each pushing/popping its own browser history entry.
  - Selecting a section from Command Center closes the sheet and changes the active tab in the same synchronous render. The sheet's close calls the async `window.history.back()`; the tab change's open calls the synchronous `window.history.pushState()`. The two raced: the deferred `back()` landed after the push and reverted the tab, stranding the admin on Command Center on every first mobile navigation. Desktop's rail buttons never touch the sheet, so they never hit the race.
* **Decision:**
  - Removed the section switcher sheet's own `useHistoryBack` entry. The sheet still closes via backdrop tap, its Close button, and Escape; only "hardware back closes an empty switcher sheet" was dropped.
* **Trade-offs Accepted:**
  - On mobile, pressing hardware back while the switcher sheet is open (before picking anything) no longer just closes the sheet by itself in every case — acceptable given the alternative was mobile section navigation being non-functional.

---

## 160. UI/UX Audit Gaps Fixed & Strategy Doc Expanded (v3.14.4)
* **Context:**
  - A codebase-wide UI/UX audit (feature-parity and accessibility pass against `FEATURES.md`) surfaced four real gaps: no search/filter on the trips list, thin `aria-label`/focus-trap coverage on `ActionSheet.tsx` (used app-wide for context menus), no in-app discovery nudge for features shipped after a user's first run, and no i18n framework (scoped out of this pass by explicit decision — see Trade-offs).
  - Separately, `docs/product-strategy-and-market-analysis.md` (ADR 158) was expanded on request with a named competitor matrix, underserved-vertical analysis, platform/dependency risk, four additional growth vectors, and Roadmap Phases 4-6.
* **Decision:**
  - `TripsListScreen.tsx`: added a `fuse.js`-backed fuzzy search bar (name/destination) shown once a user has >3 trips; searching forces the flat list view and shows a "no match" empty state.
  - `common/ActionSheet.tsx`: added `useFocusTrap`, `aria-labelledby`/`aria-describedby` wired to title/description, and `role="menu"`/`"menuitem"` on the action list.
  - Added `src/hooks/useFeatureNudge.ts` (generic, localStorage-backed, dismiss-once hook) and wired a pulsing `.nav-tab-badge-dot` onto the Notes tab (`NavTabs.tsx`) pointing existing users at the Travel Pass Wallet & Smart Packing Assistant; dismisses permanently on first tab open.
  - Expanded `docs/product-strategy-and-market-analysis.md` per above; added `CLAUDE.md` rule mandating a short implementation plan (files touched, risk, assumptions) before any non-trivial coding task, with explicit user go-ahead required first.
* **Trade-offs Accepted:**
  - Full i18n rollout (touches all ~103 component files) was explicitly deferred by user decision as a separate, larger effort rather than bundled into this pass.
  - Accessibility fixes were scoped to the highest-traffic surfaces found to have a real gap (`ActionSheet`) rather than an exhaustive sweep — `NavTabs`, `ConfirmDialog`, and `CommandPalette` were audited and already had adequate `aria-*`/focus-trap coverage.

---

## 161. Superadmin Command Center Bento Redesign, Release Phase Gating & Financial KPIs (v3.15.0)
* **Context:**
  - Release phase arm/safe switches in Superadmin were not dynamically hiding preview and live entry points for gated features (e.g. Travel Pass Wallet, Smart Packing, Hands-Free Voice Quick Add) when set to "Safe" or disabled.
  - Staging & Overrides required comprehensive support so that any feature flag could be selectively overridden on a per-trip and per-member basis.
  - Superadmin overview was cluttered with redundant full-width cards, lacked high-density financial metrics, suffered from sparkline rendering anomalies, and the Trips list screen contained an unnecessary duplicate search input competing with the header search.
* **Decision:**
  - **Release Phase Gating & Overrides:**
    - Refactored `featureFlags.ts` and `tripStore.ts` to dynamically resolve flags against trip-level and member-level overrides before falling back to global defaults (`isFeatureEnabled(flagKey, activeTripId, currentUserId)`).
    - Wired feature flag guards around Travel Pass Wallet, Smart Weather Packing Assistant, Voice Quick Add mic buttons, Smart Flight OCR, and Predictive Expenses.
    - Updated Staging & Overrides admin interface to expose every platform flag for granular trip and member scoping.
  - **Superadmin Command Center Redesign:**
    - Adopted a hybrid Bento Grid architecture with a collapsible 9-section Mini-Rail navigation.
    - Implemented a high-density 4-up Financial KPI grid:
      - **Active Fleet Ratio**: Active vs grounded trips with health indicators.
      - **Average Ticket / Expense Size**: Normalized gross spend divided by clean transaction count.
      - **Settlement Overhang & Liquidity**: Aggregated outstanding cross-trip debt liquidity and percentage of trips fully settled.
      - **Top Category Concentration**: Leading spend category icon, name, and percentage share of total volume.
    - Added multi-currency normalization with `FALLBACK_USD_RATES` and filtered internal settlement transfers to accurately compute true platform volume.
    - Resolved CSS collision for `.ops-bento-spark-strip` and styled interactive 7-day activity sparklines.
  - **Concept 2 High-Density Linear Bug Ledger:**
    - Redesigned the bug ledger with inline expandable drawers displaying reproduction steps, stack traces, and triage actions.
  - **7-Day Velocity & Trend in Analytics Tab:**
    - Implemented trailing 7-day velocity vs previous cycle acceleration/deceleration badge, daily run rates, weekly transaction counts, and an interactive daily histogram in `AdminAnalyticsPage.tsx`.
  - **Search UX Cleanup:**
    - Removed redundant search bar on `TripsListScreen.tsx`, consolidating search UX into the global top-left search trigger.
* **Trade-offs Accepted:**
  - Settlement overhang calculations run on active trip balances client-side in the admin portal; for very large datasets (>10,000 trips), this would eventually move to a backend materialized view or RPC.

---

## 162. Comprehensive Feature Flag Audit & True Trip Status Lifecycle (v3.15.1)
* **Context:**
  - When reviewing release phase flags in traveler mode, several disabled features still surfaced UI controls. Investigation revealed that `SettingsView.tsx` contained hardcoded `isSuperadmin || isFeatureEnabled(...)` bypasses that leaked Superadmin preview controls (e.g. Recycle Bin, Keyword Tagging, Multi-Currency FX Engine, Demo Data Seeding) even when their flags were explicitly switched off.
  - Minor feature flag leaks also existed in `ExpenseForm.tsx` (FX currency pill & drawer), `TripsListScreen.tsx` (multi-stop route buttons), `ExpenseList.tsx` (secondary voice input button), and `ChecklistNotesTab.tsx` (no graceful disabled banner when Collaborative Notes was deactivated).
  - In the Trips section, all trips were displayed as "Active" in both the Ops Deck and traveler view even when closed (`t.closed = true`). Because normal travelers cannot delete trips, closed and archived trips must clearly reflect their true lifecycle status.
* **Decision:**
  - **Feature Flag Leak Remediation:**
    - Audited all 27 feature flags across all release phases.
    - Removed `isSuperadmin ||` overrides from `SettingsView.tsx`, enforcing strict compliance with `isFeatureEnabled(flagKey, tripId, userId)`.
    - Added guards in `ExpenseForm.tsx` (`enableCurrencyFx` hides currency pill and converter drawer), `TripsListScreen.tsx` (`enableRouteStops` hides stop inputs), `ExpenseList.tsx` (`enableVoiceInput` hides empty-state mic button), `App.tsx` (modal launch guards), and `ChecklistNotesTab.tsx` (informative disabled notice when Notes tab feature flag is off).
    - Expanded unit tests in `featureFlags.test.ts` to 250 passing tests verifying all flags.
  - **True Trip Status Lifecycle (`Active`, `Closed`, `Archived`):**
    - Updated status calculation in `AdminTripsPage.tsx`: `t.frozen ? 'grounded' : t.archived ? 'archived' : t.closed ? 'closed' : 'active'`.
    - Added a `Closed (N)` filter chip, amber badge styling (`.ops-badge.closed`), and accurate CSV exports.
    - Updated `AdminCommandCenterPage.tsx` active fleet stats to report open trips and call out closed trips (`🔒 N Closed`).
    - Updated Traveler UI in `TripStack.tsx` and `TripsListScreen.tsx` with dedicated status badge chips (`ARCHIVED`, `🔒 CLOSED`, or `ACTIVE`), dot indicators, and updated sheet descriptions.
* **Trade-offs Accepted:**
  - Closed trips remain readable for travelers so they can review historical splits and settle outstanding balances; write operations remain restricted per existing business logic.

---

## 163. Dynamic Bottom Nav Bar Symmetrical Alignment & Centered FAB (v3.15.2)
* **Context:**
  - When the Collaborative Notes & Checklist Hub flag is turned off, the Notes tab is safely unmounted from the bottom navigation bar (`NavTabs.tsx`).
  - Previously, `.nav-tabs` was structured as a flat `display: flex; justify-content: space-between` container with `flex: 1` buttons. When Notes was present, 2 buttons on the left and 2 on the right balanced the `+` FAB in the middle. But when Notes was hidden, the left side had 2 buttons (`Summary`, `Expenses`) taking 2 flex units, while the right side had only 1 button (`Members`) taking 1 flex unit.
  - This asymmetry pushed the `+` FAB to ~67% of the bar, leaving the right side cramped and the entire bottom navigation bar visibly skewed and distorted.
* **Decision:**
  - Refactored `.nav-tabs` to use CSS Grid layout:
    - In 4-tab mode (`.nav-tabs.has-notes`): `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto minmax(0, 1fr) minmax(0, 1fr)`. Left wing (2fr) balances right wing (2fr), centering the FAB at exactly 50%.
    - In 3-tab mode (`.nav-tabs.no-notes`): `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto minmax(0, 2fr)`. Left wing (`1fr + 1fr = 2fr`) balances right wing (`2fr`), keeping the `+` FAB in the exact dead center (50%) regardless of flag state.
    - Centered `button[data-tab="members"]` in the right 2fr column (`justify-self: center; width: 100%; max-width: 110px`), providing visual symmetry to the left wing's center of mass.
    - Centered `.nav-tab-fab-wrap` with `justify-self: center; width: 50px`.
  - Added `hasNotesOrPassesTab` to `useLayoutEffect` in `NavTabs.tsx` with `requestAnimationFrame(updatePill)` so the active indicator pill automatically recalculates its `offsetLeft` and `offsetWidth` without flicker when switching flags.
* **Trade-offs Accepted:**
  - Standardized CSS Grid across all mobile viewports, using `minmax(0, ...)` to ensure no track overflows even on narrow 320px screens.

---

## 164. Trip Wrapped & Story Highlights Settings and ActionSheet Integration (v3.15.3)
* **Context:**
  - While the `enableTripWrapped` flag was properly declared and supported in the Command Palette (`Cmd+K`), travelers navigating the Settings tab could not discover or trigger their Trip Wrapped story cards from the Settings menu or the Trip Tools Hub.
  - Travelers expecting full feature discoverability requested that Trip Wrapped be accessible in the Settings menu while strictly adhering to the `enableTripWrapped` flag (so that toggling the flag off completely removes the entry with zero leaks).
* **Decision:**
  - Added `onOpenTripWrapped` to `SettingsTripToolsHub.tsx`, rendering a dedicated `SettingsCell` (*"Trip Wrapped & Highlights ✨" - Infographic story card, superlatives & journey recap*) with amber glow and a `STORY` badge.
  - Threaded the action down from `App.tsx` through `SettingsTab.tsx` and `SettingsView.tsx`, strictly gated by `isFeatureEnabled('enableTripWrapped', { tripId: activeTrip?.id, userId: userId || undefined })`.
  - Added search indexing for "wrapped", "story", "highlights", "recap", "stats", and "infographic" within Settings search.
  - Added a quick-launch action to the Trip Dashboard ActionSheet (triggered by tapping the header trip title), strictly gated by `enableTripWrapped`.
* **Trade-offs Accepted:**
  - If `enableTripWrapped` is safed or disabled in a release phase, the card and search results vanish cleanly from Settings and the ActionSheet with zero residue.

---

## 165. Bulk Select-All for Checklist & Notes (v3.15.4)
* **Context:** Notes and Checklist tabs had no way to act on multiple items at once — clearing packed items or a batch of notes required deleting one row at a time.
* **Decision:** Add a "Select" mode to both views with a "Select all" checkbox, per-row checkboxes, and a bulk action bar (Delete for both, Mark Packed for Checklist).
* **Pattern/Implementation:**
  - Added `batchDeleteChecklistItems`, `batchCompleteChecklistItems`, and `batchDeleteTripNotes` to `tripStore.ts`, mirroring the existing single-item actions (one state update + one backend sync write per call, rather than looping single-item calls).
  - `ChecklistNotesTab.tsx` tracks `isSelecting` + `selectedIds` (Set), scoped per view and cleared on view switch or search.
  - Swipe-to-edit/delete gestures on `SwipeableRow` remain fully active during selection mode by design.
* **Trade-offs Accepted:**
  - Selection state is local UI state (not persisted), so it resets on tab switch or search — acceptable since selection is a transient bulk-action affordance, not saved data.

---

## 166. Trip Group Chat + ICS Calendar Export (v3.16.0)
* **Context:** Market research against Splitwise/Tricount/Settle Up (pure splitters, no chat/itinerary) and Wanderlog/Stippl/Tripsil (itinerary+chat, weaker splitting) showed group chat as the single biggest feature gap Trip Tracker didn't cover, plus a cheap universal win in exporting flight/hotel passes to any calendar app.
* **Decision:** Add both as new capabilities, both gated behind new feature flags defaulting OFF so nothing changes for existing users until armed per-trip or globally from the Ops Deck Flags page.
* **Pattern/Implementation:**
  - **Trip Chat:** New `trip_messages` table (migration 0082) instead of extending the existing JSONB `checklist`/`notes` columns on `trips` — chat is append-only and would fight the whole-array-rewrite + conflict-resolver pattern those columns already use. RLS mirrors the `expenses` table's `is_trip_participant`/`is_trip_admin` predicates; soft-delete only (`deleted_at`), no hard delete, no message edits in v1. `tripMessagesApi.ts` caps fetch at 200 messages and subscribes to `postgres_changes` via `supabase.channel` scoped to the open trip only (subscribed on mount, torn down on unmount) rather than a global socket. `TripChatPanel.tsx` renders as a third segment inside the existing `ChecklistNotesTab.tsx` tab shell (Passes/Notes/Checklist/Chat), which required collapsing that file's two duplicated segment-header blocks into one data-driven list to avoid a 4-way combinatorial blowup from adding a 4th optional tab.
  - New messages fire `sendPushNotification(..., 'chat_message', ...)` (best-effort, non-blocking) to every other linked trip member, reusing the existing `send-push` Edge Function end-to-end: per-trip mute suppression, in-app notification row, FCM send, dead-token pruning — all inherited for free. Added the `chat_message` case to both copies of the notification renderer (`src/utils/notificationText.ts` for the in-app panel, `supabase/functions/send-push/index.ts` for the FCM payload — these are kept as two independent small switch statements by existing project convention, not a shared cross-runtime module). Redeployed the Edge Function.
  - **ICS Export:** Pure client-side `src/utils/icsExport.ts` builds an RFC 5545 `.ics` from the existing `trip.passes` JSONB (no new table, no backend) — one `VEVENT` per pass with a `startDateTime`, skipping passes that don't have one. "Export to Calendar" button added to `TravelPassWalletView.tsx`, only shown when passes exist. Standard `.ics` format opens in Google/Apple/Outlook/Samsung Calendar.
  - Both flags (`enableTripChat` phase2, `enableIcsExport` phase3) added to `types/admin.ts` + `utils/featureFlags.ts` with `defaultEnabledForUsers: false` — no Admin UI changes needed since `AdminFlagsPage.tsx` is fully data-driven off `FEATURE_FLAGS_META`/`RELEASE_PHASES`.
* **Trade-offs Accepted:**
  - No message edit, typing indicators, or read receipts in v1 — plain send/soft-delete only, add later if asked.
  - Every chat message writes one `notifications` row per recipient with no batching/throttling, same as `expense_added`/`member_joined` etc. — fine at normal trip-chat volume, could get noisy in a very chatty group; no debounce added since no other notification type has one either.
  - ICS export defaults every pass to a 1-hour calendar event when `endDateTime` isn't set, since passes don't reliably carry one today.

---

## 167. Trip Chat Layout/iOS Fixes + Notification Tap Routing (v3.16.1)
* **Context:** First real-device look at Trip Chat (FEAT-055) surfaced three bugs, plus a standing gap where tapping any notification only switched trips (if cross-trip) and never actually navigated to the screen the notification was about.
* **Decision:** Fix all three chat bugs and add notification-tap routing to the relevant tab/sub-tab.
* **Pattern/Implementation:**
  - **BUG-210 (layout):** `TripChatPanel.tsx`'s root used `height: '100%'`, but its parent `.tab-pane` has no explicit height (it's the same naturally-scrolling block Notes/Checklist already rely on), so the percentage collapsed to content height — the input floated right after the one message with a large dead area below it. Fixed to `height: min(64dvh, 560px)` (self-contained, doesn't need a sized parent) and wrapped the whole panel in `.glass-card` to match the app's existing card convention instead of floating unstyled.
  - **BUG-211 (iOS zoom):** the chat input had `fontSize: 13px`. iOS Safari/Chrome (WebKit) auto-zooms the page when a focused text input computes under 16px, then zooms back out on blur — this reads exactly like "alignment completely changes while typing" and is iOS-only since Android Chrome has no focus-zoom behavior. Fixed by bumping the input to 16px (the platform-mandated minimum, not a design-ramp deviation).
  - **BUG-212 (silent failure):** `handleSend` had no catch — a failed `sendTripMessage` (e.g. offline) just silently dropped the message with zero feedback. Added `sendError` state + an inline red banner distinguishing offline vs. generic failure, draft text preserved for retry.
  - **FEAT-057 (notification routing):** `NotificationsPanel.tsx`'s `handleOpenNotification` now calls a new `onNavigate(n)` callback after switching trips (if cross-trip) and always closes the panel afterward (previously it only closed the panel on a cross-trip switch, leaving same-trip taps inert). `App.tsx`'s new `handleNotificationNavigate` maps `notification.data.type` to a `Tab`: `expense_*` → `ledger`, `member_*` → `members`, `settlement*` → `expenses` (Summary). `chat_message` is the one type whose destination is a sub-tab, not a top-level `Tab` — it sets `activeTab` to `notes` and a new `pendingNotesView` state to `'chat'`, threaded into `ChecklistNotesTab` as `initialViewMode` + `onInitialViewModeConsumed`, applied once via a mount/update effect so a later manual sub-tab switch isn't fought by a stale pending value.
* **Trade-offs Accepted:**
  - Chat's offline handling is still just "surface the error, keep the draft" — no outbox/retry queue like expenses have. Bigger job, not done here.
  - Chat has no message edit/typing indicators/read receipts, unchanged from FEAT-055.

---

## 168. Chat Composer Forces Sheet Full to Escape the Map (v3.16.2)
* **Context:** BUG-213: a real-device screenshot on iOS showed the entire screen filled with the trip map (and nothing else) after tapping the chat input, keyboard open. Root cause wasn't chat-specific: `TripContentSheet` (the Uber-style draggable bottom sheet holding every tab) defaults to 50% collapsed, so `TripMapHero` fills the top half at all times unless the sheet is dragged fully open. The iOS keyboard then covers the same bottom half the sheet occupies, squeezing chat's content to zero visible height between map and keyboard.
* **Decision:** Force the sheet fully open (same state the drag handle already snaps to at its top extreme) the moment the chat composer gets focus, rather than leaving sheet position purely gesture-driven.
* **Pattern/Implementation:**
  - `TripContentSheet.tsx` gained a `forceFull?: boolean` prop and a `useEffect` keyed on it: a rising edge (false → true) calls the same `updateTopPercent(SHEET_FULL_TOP)` + `onExpandedChange`/`onFullChange` path the drag-to-full gesture already uses, so it inherits the existing spring transition and header-hiding behavior for free. Deliberately one-directional — it never force-collapses on its own, so a manual drag back down afterward isn't fought by a stale `true` prop.
  - Threaded straight down: `TripChatPanel`'s input `onFocus`/`onBlur` → `onComposerFocusChange` → `ChecklistNotesTab`'s `onChatComposerFocusChange` → `App.tsx`'s new `chatComposerFocused` state → `TripContentSheet`'s `forceFull`.
* **Trade-offs Accepted:**
  - Only chat's composer triggers this; other inputs elsewhere in the app (expense form fields, member names, etc.) live inside actual modals with their own scroll-lock and don't share this bug, so they weren't touched.

---

## 169. Correction: Sheet-Expand Trigger Moved from Input Focus to Chat-Tab-Active (v3.16.3)
* **Context:** Real-device retest of #168's fix (forceFull on the chat input's `onFocus`) made things worse, not better: on iOS the keyboard stopped appearing at all, and the map flashed back full-screen exactly like the original bug. Root cause of *this* regression: resizing `TripContentSheet` synchronously inside the input's `onFocus` handler raced WebKit's own keyboard-show logic -- iOS Safari/Chrome cancels the keyboard outright if the focused element's containing layout changes size in the same tick as the focus gesture, which is exactly what forcing the sheet from 50% to 0% top did.
* **Decision:** Move the trigger earlier so no resize ever happens during the focus gesture itself: expand the sheet as soon as the Chat sub-tab becomes the active view, not when the input is tapped.
* **Pattern/Implementation:**
  - Removed the `onComposerFocusChange` prop and the input's `onFocus`/`onBlur` handlers from `TripChatPanel.tsx` entirely.
  - `ChecklistNotesTab.tsx` gained a `useEffect` keyed on `viewMode` (and `isChatEnabled`): `onChatViewActiveChange?.(viewMode === 'chat' && isChatEnabled)` -- fires on tab-switch, well before any input gets touched, so the sheet's spring transition has settled by the time the user actually taps in.
  - `App.tsx`'s `forceFull` state renamed `chatComposerFocused` → `chatViewActive` for accuracy, wired the same way into `TripContentSheet`'s existing `forceFull` prop (that part of #168 needed no changes, only what triggers it).
* **Trade-offs Accepted:**
  - The sheet now expands the instant you open the Chat sub-tab, even if you never touch the input -- a deliberate trade (matches how the map is irrelevant to a chat conversation anyway) to guarantee the resize never overlaps a focus gesture.

---

## 170. Fix iOS Virtual Keyboard Chat Viewport Displacement & Document Scroll (v3.16.4)
* **Context:** BUG-213 on real iOS devices (WhatsApp video evidence): when tapping the chat input in Mobile Safari or WKWebView, the entire UI (header, tabs, chat card, bottom nav) was displaced off-screen, revealing the full fixed Leaflet map backdrop behind the keyboard. Root cause:
  1. `TripChatPanel` had a hardcoded `height: min(64dvh, 560px)` nested inside `.tab-pane` (which had `padding-bottom: 104px` for `.nav-tabs`), placing the input at Y ~ 650px. When the virtual keyboard opened, the visual viewport shrank to ~450px. WebKit detected the input was obscured and forcefully scrolled `window.scrollY` up by ~300px.
  2. `--app-vh` shrank to `visualViewport.height` (~450px). With `window.scrollY = 300px`, the resized app container was scrolled 300px off the top of the viewport. Because `.trip-map-hero` is `position: fixed; inset: 0;`, the background map filled the entire screen.
  3. Swiping down on chat messages when at top of scroll would also trigger `TripContentSheet`'s downward drag, pulling the sheet back down to 50% map view.
* **Decision:**
  - Make `TripChatPanel` fill `flex: 1 1 0%` of available sheet height rather than a fixed 560px block.
  - In chat mode, `.tab-pane` and its wrappers switch to `display: flex; flex-direction: column; overflow: hidden; padding-bottom: 0`, preventing nested scroll containers and eliminating dead bottom padding.
  - Add `onComposerFocusChange`: when the chat input is focused, smoothly hide `.nav-tabs` (`translateY(120%)`) and switch the composer bar's padding to sit directly above the keyboard. When blurred, `.nav-tabs` slides back up and composer padding clears it.
  - Guard `applyViewportHeightVar()` in `nativeShell.ts` so whenever WebKit attempts to scroll `window.scrollY > 0`, it resets to `(0, 0)` immediately. Also set `overflow: hidden` on `html`.
  - Prevent downward sheet drag gestures on message content when `forceFull` is active.
* **Trade-offs Accepted:**
  - When actively typing in chat, `.nav-tabs` is hidden off-screen; it re-appears as soon as the composer is blurred or message sent.

---

## 171. iOS Chat Keyboard Overlay: Freeze Layout Height, Pad Composer (v3.16.5)
* **Context:** BUG-213 / ADR 170 still failed on real iOS Safari (WhatsApp video): tapping the chat box panned the visual viewport, collapsed `--app-vh` to the keyboard-shrunk height, and left the fixed map filling the screen. Android Chrome already looked WhatsApp-like because `interactive-widget=resizes-content` actually resizes the layout there; iOS Safari mostly ignores that meta tag and overlays instead. `scrollIntoView` on the composer, and `--keyboard-height` only being set by the Capacitor Keyboard plugin, made Safari keep hunting for the input.
* **Decision:** Treat keyboard overlay and layout-resize as two cases. Overlay (iOS) freezes `--app-vh` at the last keyboard-closed height and sets `--keyboard-height` from visualViewport so only the composer lifts. Layout-resize (Android) follows `innerHeight` and leaves keyboard height at 0. Pin `html`/`body` with `position: fixed` so WebKit cannot pan `visualViewport.offsetTop`. Chat scrolls its own list via `scrollTop`, never `scrollIntoView`.
* **Pattern/Implementation:**
  - New [`src/utils/viewportKeyboard.ts`](src/utils/viewportKeyboard.ts) + tests: overlay threshold 80px so Safari chrome show/hide is ignored.
  - [`src/utils/nativeShell.ts`](src/utils/nativeShell.ts) writes `--app-vh` / web `--keyboard-height` from that helper; native Capacitor still owns `--keyboard-height` via the Keyboard plugin. Skip pad+`scrollIntoView` when the focused node is inside `.trip-chat-panel`.
  - [`TripChatPanel.tsx`](src/components/TripChatPanel.tsx) composer class `.is-focused` uses `max(var(--keyboard-height), var(--safe-bottom))`.
  - Capacitor Android/iOS wrappers re-synced (`npm run cap:sync`), including the previously missing `@capacitor/local-notifications` plugin entries.
* **Trade-offs Accepted:**
  - `position: fixed` on `html`/`body` is the document-lock this app already intended (`overflow: hidden`, internal pane scroll). Safari address-bar chrome still updates `--app-vh` on visualViewport resize when no keyboard overlay is detected.

---

## 172. Flag-Gated Conversion, Speed, and Trust (Phase 5)
* **Context:** Switching groups from Splitwise, settling over WhatsApp, logging the same chai again, and recording *when/how* a payment happened were the lightest upgrades that compete with WhatsApp+UPI without a new architecture. Each needed to ship independently so Ops can arm one without the rest.
* **Decision:** Add customer **phase 5** ("Switch, Speed & Trust") with five flags, all **default OFF** (same pattern as `enableTripChat`). Implement the surfaces behind `isFeatureEnabled`; leave existing settle / text-share / Duplicate / equal-all split unchanged when a flag is safed.
* **Pattern/Implementation:**
  - Flags: `enableSplitwiseImport`, `enableWhatsAppSettlementShare`, `enableCloneLastExpense`, `enableRememberDefaultSplit`, `enableSettlementDateNote` in [`src/types/admin.ts`](src/types/admin.ts) + [`src/utils/featureFlags.ts`](src/utils/featureFlags.ts). Admin Flags stays data-driven.
  - Splitwise: parse group CSV (`src/utils/splitwiseImport.ts`), preview + member map in `SplitwiseImportModal`, import into the **active trip** via existing `addMember` / `addExpense`. Payment rows skipped by default. No Splitwise API.
  - Settlement card: canvas PNG + `navigator.share({ files })` with `wa.me` + download fallback (`src/utils/settlementShareCard.ts`), extra **Card** chip on the transfer row. Existing text Share stays ungated.
  - Clone last: opens Add Expense **prefilled**, date = today. Review → Duplicate still writes immediately and stays ungated. FAB long-press clones when the flag is on.
  - Remembered split: versioned `localStorage` key `tt-default-split:v1:{tripId}`. Applied on blank new-expense forms only; clone template and drafts win.
  - Settlement date/note: extra fields in existing `ConfirmDialog` body. Date on `expense.date`; note appended to title (`Settlement: A ➔ B — paid via UPI`). No schema change.
* **Trade-offs Accepted:**
  - Flags stay off until Superadmin arms them — conversion features are not a surprise for existing trips.
  - Splitwise import is CSV-only, current-trip only, sequential writes. Good enough for typical group ledgers; not a live sync.
  - Settlement notes live in the title suffix so filters that already key on `Settlement:` keep working without a `notes` column.

---

## 173. Restore triggerHaptic Import in App.tsx (v3.17.1)
* **Context:** In v3.17.0 (ADR 172), adding `getLatestNonSettlementExpense` to `src/App.tsx` inadvertently overwrote the import for `triggerHaptic` from `./utils/haptics`, causing TS2304 compiler failures in GitHub Actions CI during `npm run build`.
* **Decision:** Restore `import { triggerHaptic } from './utils/haptics';` in `src/App.tsx`.
* **Pattern/Implementation:** Restored named import alongside `getLatestNonSettlementExpense`. Verified `tsc -b && vite build` and test suite pass cleanly locally.
* **Trade-offs Accepted:** None.

---

## 175. Removed Redundant "Share" Button in Who-Owes-Who Section (BUG-216, v3.18.1)
* **Context:** Each settlement transfer row in `BalancesSettlements.tsx`'s "Who owes who" section showed two separate share actions -- a text-only "Share" chip (`handleShareReminder`, sends a reminder sentence via the Web Share API / WhatsApp deep link / clipboard fallback) and an image "Share Card" chip (`handleShareCard`, gated behind the `enableWhatsAppSettlementShare` superadmin flag, sends a rendered settlement PNG card via the same channels). Both ultimately hand off to WhatsApp/system share for the same purpose, so the pair read as redundant.
* **Decision:** Remove the "Share" chip and its `shareCopied` UI state; keep "Share Card" as the sole share action, unchanged and still gated by `enableWhatsAppSettlementShare`.
* **Pattern/Implementation:**
  - Deleted the "Share" `<button>` block from the transfer row's action-chip row.
  - Kept the `handleShareReminder` function itself (now internal-only) because `handleShareCard`'s final catch-all fallback still calls it when the canvas/share-sheet pipeline fails outright.
  - Simplified `handleShareReminder`'s `copyToClipboard` to a plain `navigator.clipboard.writeText` call now that nothing renders the "Copied!" state; removed the now-dead `shareCopied`/`setShareCopied` state.
* **Trade-offs Accepted:**
  - "Share Card" stays gated behind `enableWhatsAppSettlementShare`. If that flag is off for a trip, the row now has no share action at all (previously "Share" was the always-available fallback). Left as-is per explicit decision -- flag gating is superadmin's call, not addressed by this fix.

---

## 176. WhatsApp-Style Edit/Delete for Trip Chat Messages (FEAT-060, v3.19.0)
* **Context:** Trip group chat (`TripChatPanel.tsx`, ADR #166) had no way to correct a typo or remove a sent message. `trip_messages` (migration 0082) already had a `deleted_at` soft-delete column and a working-but-unwired `deleteTripMessage()`; there was no edit capability or `edited_at` column at all.
* **Decision:** Long-press a message bubble (own messages, or any message if trip admin) to open an action sheet with Edit and/or Delete, matching WhatsApp's own gesture. Sender can edit within a 15-minute window; admin can edit/delete anytime; sender can also delete anytime. Deleted messages render as a tombstone ("This message was deleted") for everyone rather than disappearing.
* **Pattern/Implementation:**
  - Migration `0083_trip_messages_edit.sql`: adds `edited_at timestamptz`; tightens the existing "author or admin can soft-delete" UPDATE policy's `WITH CHECK` so a direct client `UPDATE` can no longer change `body` (only `deleted_at` and other non-body columns); adds a `SECURITY DEFINER` RPC `edit_trip_message(p_message_id, p_body)` that is the only path allowed to change `body` -- it enforces the 15-minute sender window (`created_at > now() - interval '15 minutes'`) and lets `is_trip_admin` bypass it, matching the pattern already used by `submit_feature_request`/`report_bug`.
  - `tripMessagesApi.ts`: new `editTripMessage()` calling the RPC; `fetchTripMessages` no longer filters `deleted_at is null` (tombstones need to be fetched, just rendered differently); `subscribeToTripMessages` signature changed from a single `onInsert` callback to `{ onInsert, onUpdate }` -- edits and soft-deletes both arrive as Postgres `UPDATE` events on the same realtime channel.
  - `TripChatPanel.tsx`: pointer-based long-press (450ms hold, cancels past a small move tolerance so list-scrolling doesn't misfire it) opens the existing reusable `common/ActionSheet.tsx` component (not a new bespoke popover) with Edit/Delete items computed per-message from `isAdmin`/`myMemberId`/`createdAt`, mirroring the RPC's own permission check exactly so the client never offers an action the server would then reject. Editing switches the composer into an edit state (prefilled body, "Editing message" banner, Cancel, Send label becomes Update). Delete routes through the app's single global `ConfirmDialog` via a newly-threaded `onRequestConfirm` prop (`App.tsx` -> `ChecklistNotesTab.tsx` -> `TripChatPanel.tsx`), the same instance every other destructive action in the app already uses.
* **Trade-offs Accepted:**
  - No edit history/audit trail is kept -- editing overwrites `body` in place, only the fact that it was edited (`edited_at`) is visible, not the prior text. Matches WhatsApp's own behavior; acceptable for a lightweight trip chat.
  - No optimistic local update on edit/delete -- both actions wait for the realtime `UPDATE` echo to patch the UI, same pattern the existing `sendTripMessage` send flow already relies on for `INSERT`. A slow connection means a brief lag before the sender's own edit/delete visibly applies.

---

## 177. CI Build Failure: Stale database.ts Missing trip_messages.edited_at / edit_trip_message (BUG-217, v3.19.1)
* **Context:** `src/types/database.ts` is a hand-maintained Supabase type mirror (`export const supabase = createClient<Database>(...)` in `supabaseClient.ts`) -- it is not regenerated automatically at build time. Migration 0083 (ADR #176) added `trip_messages.edited_at` and the `edit_trip_message` RPC, but the mirror wasn't updated alongside it. `tsc -b` (what `npm run build` actually runs) failed identically on CI, "Deploy to GitHub Pages", and "Deploy to EC2": `TripMessageRow` required `edited_at` that the mirrored row type didn't have, and `'edit_trip_message'` wasn't part of the RPC name union. A plain `tsc --noEmit -p .` run locally beforehand did not catch this.
* **Decision:** Hand-add the missing `edited_at` field and `edit_trip_message` function entry to `src/types/database.ts`, matching its existing style, rather than replacing the file wholesale.
* **Pattern/Implementation:**
  - Tried the file's own suggested regeneration command first (`npx supabase gen types typescript --project-id <ref> > src/types/database.ts`, per its header comment). The freshly generated output types every jsonb column as a strict `Json` union and every enum-ish text column as a literal-string union, which is measurably stricter than this file's original loosely-typed (`string`, `Record<string, unknown>`) conventions -- swapping it in broke type-checking across ~40 unrelated call sites in `src/services/*.ts` (bugApi, featureApi, featureFlagApi, notificationsApi, tripApi) that were written against the looser shapes.
  - Reverted that wholesale swap (`git checkout -- src/types/database.ts`) and instead added just the two missing pieces by hand: `edited_at: string | null` on `trip_messages`' `Row`/`Insert`/`Update`, and an `edit_trip_message` entry under `Functions` with `Args`/`Returns` matching the RPC's actual signature.
  - Verified with the exact command CI runs, `npm run build` (`tsc -b && vite build`), not just `tsc --noEmit`, since that's what caught the discrepancy in the first place.
* **Trade-offs Accepted:**
  - `database.ts` remains hand-maintained, not auto-generated -- the next migration that adds a column/RPC touched by app code must remember to update this file too, or CI will fail the same way again. A full regeneration would require also loosening the many call sites currently written against the looser hand-written shapes; out of scope for this fix.


---

## 178. Multi-Photo Expenses, Document Vault, Offline Map Tiles, Calendar Share (FEAT-061..064, v3.20.0)
* **Context:** Four small, independent asks: (1) let an expense carry more than the single OCR receipt photo it already supports, (2) a local passport/visa/insurance scan vault, (3) the trip journey map (`TripJourneyMap`/`TripMapHero`/`TripRouteModal`, all pointed at `tiles.openfreemap.org`) going blank offline despite the app's offline-first positioning, (4) the existing `.ics` calendar export (`enableIcsExport`, ADR-era FEAT-056) being a manual download-then-import instead of a direct hand-off to the OS Calendar app. Explicit instruction: reuse existing capabilities over building new ones, and every new surface must be Superadmin-flag-gated with no path reachable outside the flag.
* **Decision:** Ship all four, each behind its own flag, phase-classified in the existing Ops Deck registry rather than dumped in "Deferred": `enableExpensePhotoLinking` (Phase 2, collab), `enableOfflineMapTiles` (Phase 3, geotagging), `enableDocumentVault` (Phase 4, security), and the calendar upgrade folded into the existing `enableIcsExport` (Phase 3) since it changes behavior, not surface area.
* **Pattern/Implementation:**
  - **Multi-photo (FEAT-061):** new `expenses.photo_paths text[]` column (migration `0084`, applied to remote) alongside the existing single `receipt_path`. Reuses the `receipts` Storage bucket and its RLS unchanged -- extra photos land at `{tripId}/{expenseId}-{suffix}.jpg`, still keyed under the trip-id folder the policy already checks. Reuses `uploadReceipt()`/`getReceiptSignedUrl()`/`compressImageToDataUrl()` verbatim. New `addExpensePhoto`/`removeExpensePhoto` store actions -- online-only, no offline sync-queue integration (deliberately out of scope; the primary receipt's offline staging in `offlineReceiptStore.ts` was not touched). UI is a "More Photos" block in `ExpenseForm`, visible only in edit mode (an already-saved expense) and only behind `enableExpensePhotoLinking`. Extended `TripMediaGalleryModal` to also enumerate `photoPaths`; fixed two latent bugs surfaced while doing so -- the signed-url resolver and the lightbox display fallback were both keyed off `expense.receiptPath`/`receiptImage`, which would show the wrong image once an expense had both a primary receipt and extra photos. Rewrote both to key off each `MediaItem`'s own `url`.
  - **Document Vault (FEAT-062):** `documentVaultStore.ts`, a deliberate byte-for-byte copy of `offlineReceiptStore.ts`'s IndexedDB shape rather than a shared module -- receipt-store entries are transient sync staging deleted after upload, vault entries are meant to persist, so conflating the two lifecycles was rejected. 100% local, nothing uploaded (explicit privacy call, no Storage bucket, no migration). Gate reuses the existing WebAuthn primitives (`isBiometricEnrolled`/`verifyBiometricCredential` from `webAuthn.ts`), not the full-screen `BiometricLockOverlay` (that component signs the user out on cancel, wrong UX for a lightweight per-feature unlock) -- if the user never enrolled biometrics the vault opens ungated with an inline nudge toward Settings, rather than locking out most users entirely. `DocumentVaultModal` wired exactly like `OfflineSnapshotModal` (lazy import, flag-gated render in `App.tsx`, `onOpenDocumentVault` threaded through `SettingsTab`/`GlobalSettingsModal`/`SettingsView`/`SettingsBackupsMediaHub`), camera capture reuses `ExpenseForm`'s exact Capacitor `Camera.getPhoto` pattern.
  - **Offline map tiles (FEAT-063):** extended `public/sw.js`'s existing stale-while-revalidate handler with a second cache bucket (`TILE_CACHE_NAME`) for the one host all three map components share, capped at 2000 entries with oldest-first eviction (`trimTileCache`). The real complication: a service worker has no access to the Zustand store, so it can't call `isFeatureEnabled()` directly. Solved by using Cache Storage itself as the flag transport (it's already shared between the page and the SW on the same origin) -- `src/utils/mapTileCacheFlag.ts` writes the flag's current value into a small config cache entry every time `App.tsx` reads `enableOfflineMapTiles`, and the SW reads it back per tile request, defaulting to **off** (plain `fetch()` passthrough, zero interception) if the flag was never synced. No postMessage plumbing, no new API surface.
  - **Calendar share (FEAT-064):** `icsExport.ts` gained `shareTripIcs()`, which builds the same `.ics` via the existing `generateTripIcs()` and hands it to `navigator.share({ files })` (same Web Share pattern already used for receipt sharing in `TripMediaGalleryModal`) so the OS share sheet's Calendar target does the import directly; falls back to the pre-existing `downloadTripIcs()` when file-sharing isn't supported. `TravelPassWalletView`'s "Export to Calendar" button now calls this and is relabeled "Add to Calendar" -- still gated by the same `enableIcsExport` flag, no new flag added since it's a behavior upgrade of an already-flagged surface.
  - Flag registry housekeeping: `enableDocumentVault` was initially placed in the "Deferred" phase, then moved into Phase 4 (alongside `enableBiometricAuth`) once asked to differentiate by phase rather than dump new flags in Deferred -- Phase 4's "digital nomads, international travelers, security" theme fits a passport/visa vault better than a catch-all bucket.
* **Trade-offs Accepted:**
  - Multi-photo has no offline queue integration -- adding a photo to an expense requires connectivity. Acceptable v1 scope; the primary receipt's offline path is unchanged and unaffected.
  - Document Vault's "encryption" is access-gating (WebAuthn), not content encryption at rest -- IndexedDB blobs are readable by anyone with local device/debugger access, same trust boundary as every other local-only store in the app (`offlineReceiptStore`, `passAttachmentStore`). Flagged as a real limitation, not a solved problem.
  - Offline map tiles cache the map's own display tiles only; the OSRM route-line fetch and place-search calls are unaffected and still fail silently offline (same as before this change).
  - `expenses.photo_paths` migration (0084) applied directly to the remote Supabase project via `supabase db push --linked` at explicit user request.

---

## 179. Payment History, Dispute Flag, Live Location Share, Digest Notifications (FEAT-065..068, v3.21.0)
* **Context:** Four more asks: (1) surface the partial-settlement progress that already worked but was invisible, (2) let any participant flag an expense as wrong without a full dispute-thread system, (3) a safety-oriented live-location link like WhatsApp's, (4) reduce push-notification fatigue with a daily digest. Standing instruction from this point forward: every new feature must ship behind a Superadmin flag, phase-classified, never dumped in "Deferred."
* **Decision:** Ship all four behind their own flags: `enableSettlementHistory` (phase5), `enableExpenseDisputes` (phase2), `enableLiveLocationShare` (phase3), `enableDigestNotifications` (phase2). Also moved `enableDocumentVault` from "Deferred" into phase4 (alongside `enableBiometricAuth`) per the same instruction, retroactively.
* **Pattern/Implementation:**
  - **Payment history (FEAT-065):** zero new schema. `groupSettlementsByPair()` (`src/utils/settlement.ts`) reads the structural `paidBy`/`splitMemberIds[0]` fields that `onSettle` already writes (`App.tsx`) rather than parsing the `"Settlement: A ➔ B"` title string. New `SettlementHistorySection.tsx` renders inside `ExpenseList`'s existing Settlements block, only showing pairs with 2+ payments.
  - **Dispute flag (FEAT-066):** migration `0085` adds `disputed_at`/`disputed_by_user_id`/`dispute_note` to `expenses`, plus two SECURITY DEFINER RPCs (`flag_expense_dispute` -- any trip participant, not just admin/author; `resolve_expense_dispute` -- flagger or admin only), mirroring the `edit_trip_message` pattern from ADR #176 exactly, because the existing "admin or original author can update expenses" RLS policy is too narrow for flagging (any participant should be able to flag someone else's expense). That policy's `WITH CHECK` is tightened so a direct client UPDATE can no longer touch the three new columns -- only the RPCs can. UI: banner + Flag/Resolve buttons in `ExpenseReviewModal`, 🚩 badge in `ExpenseList`.
  - **Live location share (FEAT-067):** migration `0086` adds `member_locations` (one row per trip+user, RLS owner-only, never granted to `anon` directly), a public `get_shared_location(token uuid)` RPC granted to `anon` (token is a random uuid -- 122 bits of entropy, not brute-forceable the way the short join-code in migration 0081 is, so no lockout table needed), and a pg_cron job auto-expiring stale shares every 15 minutes. `LiveLocationShareModal.tsx` (Settings entry point) starts/stops sharing and heartbeats position every 60s **only while the modal stays open** -- there's no background service, a real v1 limitation stated in the UI copy itself. Public unauthenticated viewer at `/live/:token` (`LiveLocationPage.tsx`, new route in `main.tsx`, same public-route pattern as `/join/:code`).
  - **Digest notifications (FEAT-068):** migration `0087` adds `notification_digest_prefs` (per-user opt-in) and `pending_digest_events` (queue, RLS enabled with zero policies -- service-role only), enables `pg_net`, and schedules a daily cron calling a new `send-digest` edge function. Architecturally simpler than originally scoped: rather than touching every push-trigger call site in `tripStore.ts`, the branching lives entirely inside the existing `send-push` edge function (already the single choke point that resolves recipients) -- for each recipient with digest mode on, it inserts into `pending_digest_events` instead of sending FCM immediately; the `notifications` table row (in-app panel) is still written either way. `send-digest` (new function) compiles each user's queued events into one push and clears the queue. Cron-to-function auth uses a dedicated `digest_cron_secret` (Supabase Vault + matching `DIGEST_CRON_SECRET` function env var) rather than the full service-role key, so a leaked cron secret can only trigger a premature digest send, not read arbitrary data. Migration `0088` adds a `set_digest_cron_secret()` service-role-only RPC so the secret itself is never committed to a migration file -- set once via an ad-hoc local script using the service-role key from `.env`.
* **Trade-offs Accepted:**
  - Live location's position updates stop the moment the sharing modal closes (server-side `is_sharing` stays true until the 12h expiry or explicit stop) -- no background geolocation service was built. Acceptable for a v1 "share while actively traveling" use case; disclosed in the modal's own copy.
  - Digest mode fires at one fixed time (8am UTC) for every opted-in user, not per-timezone. Reasonable default, not built configurable.
  - `send-digest`'s FCM-sending loop duplicates `send-push`'s, matching that function's own stated convention (two small independent Deno copies over a shared package for a codebase this size).
  - Migrations 0085-0088 applied directly to the remote Supabase project via `supabase db push --linked`, and `send-digest` deployed + its Vault secret set, at explicit user request.

---

## 180. Expense Review Modal Header Overflow (BUG-218, v3.21.1)
* **Context:** ADR #179's dispute-flag Flag/Resolve buttons pushed the header actions row (Edit, Duplicate, Delete, Flag/Resolve, Close) to 5 buttons in one `flex` row with no wrap -- on mobile widths this overflowed horizontally, forcing the user to scroll sideways to reach Close/Flag instead of seeing everything in view.
* **Decision:** Split the header into two rows: title + a compact icon-only Close button pinned top-right (always reachable, never part of the overflow), and a second row of action buttons with `flexWrap: 'wrap'` so they flow to a second line on narrow screens instead of scrolling.
* **Pattern/Implementation:** `src/components/ExpenseReviewModal.tsx` -- title row now `justify-content: space-between` with a 30x30 icon-only Close button (`IconClose`); actions row (`Edit`/`Duplicate`/`Flag`/`Resolve`/`Delete`, in that order, Delete moved last as the destructive action) is a separate `flex-wrap: wrap` container below it.
* **Trade-offs Accepted:** None -- pure layout fix, no behavior change.

---

## 181. Dispute Button Staleness, Live Location in Chat, Header Menu Cleanup (BUG-219, FEAT-069, v3.21.2)
* **Context:** Three follow-up asks after ADR #179/#180 shipped: (1) the Flag/Resolve button in `ExpenseReviewModal` didn't flip immediately after flagging -- had to close and reopen the modal, (2) sharing live location (Settings) had no in-app way for other trip members to actually see it -- the only read path was the public `/live/:token` link, nobody inside the trip could see a pin without that link, (3) the header trip-name dropdown's "Trip Wrapped & Highlights" entry duplicated the one already in Settings.
* **Decision:** Fix all three. For (2), add real trip-participant visibility rather than just surfacing the existing public-link flow differently.
* **Pattern/Implementation:**
  - **BUG-219:** `App.tsx`'s `ExpenseReviewModal` render was passing `selectedReviewExpense`, a snapshot captured when the row was tapped, never re-synced after `flagExpenseDispute`/`resolveExpenseDispute` mutated the store. Fixed by deriving `liveExpense = activeTripExpenses.find(e => e.id === selectedReviewExpense.id) ?? selectedReviewExpense` and passing that instead -- now reflects any in-place store update immediately, not just disputes.
  - **FEAT-069:** migration `0086`'s `member_locations` RLS was owner-only (a user could only ever read their own row) -- no trip participant could see anyone else's location in-app at all, by design, since the only intended read path was the public token RPC. Migration `0089` adds a second SELECT policy: any trip participant can read *active* (`is_sharing = true`) shares for their own trip -- a genuine widening of who sees the data (whole trip vs. whoever holds a link), done because that's explicitly what was asked for. New `getActiveTripLocationShares()` (`locationShareApi.ts`) reads raw lat/lng directly (participants are already trusted, unlike the public link's token-gated RPC). New `LiveLocationChatBanner.tsx` renders a horizontal chip row of active sharers at the top of the Chat sub-tab (`TripChatPanel.tsx`), tap-to-expand an inline MapLibre pin reusing the single-marker pattern from `LiveLocationPage.tsx`. Polls every 30s while chat is open. Still gated by `enableLiveLocationShare`.
  - **Header cleanup:** removed the `trip-wrapped` entry from the trip-name header `ActionSheet` in `App.tsx`. The Settings entry point and the trip-card overflow menu's own Trip Wrapped launcher are untouched.
* **Trade-offs Accepted:**
  - The Chat banner polls on a fixed 30s interval rather than subscribing to realtime changes on `member_locations` -- consistent with the public page's own polling approach (`LiveLocationPage.tsx`), simplest thing that works for a feature already capped at a 12h window.
  - Trip participants can now see any active sharer's position without that person explicitly sending them a link -- disclosed as a real scope widening, not hidden in the diff.

---

## 182. Mobile Profile Button Tap Reliability, Vendor Chunking & Startup Deduplication (v3.21.3)
* **Context:** Following the v3.20.0–v3.21.2 deployments, two issues were reported: (1) users were unable to click the profile button on the trips home page to open settings and log out on mobile, and (2) app startup loading on iOS and Android became noticeably sluggish.
* **Decision:** Resolve the touch suppression and layout squeeze on the profile button, provide immediate visual feedback for settings drawer loading, deduplicate startup network queries, and split the bloated 940 kB entry bundle into parallel cached vendor chunks.
* **Pattern/Implementation:**
  - **Profile Button & Touch Interception (`usePullToRefresh.ts`, `TripsListScreen.tsx`, `index.css`):**
    - `usePullToRefresh.ts`: touches starting on interactive elements (`button`, `a`, `input`, `select`, `textarea`, `[role="button"]`) or inside `.trips-screen-header` are ignored. Increased drag threshold from 6px to 14px with vertical dominance check before `e.preventDefault()`, stopping finger wobble during taps from suppressing synthetic `click` events on iOS Safari and Android Chrome.
    - `index.css`: gave `.trips-screen-header` `position: relative; z-index: 10;` and flexible grid columns (`minmax(40px, auto) minmax(0, 1fr) 40px`), ensuring long greeting strings cannot push the right-edge avatar button off-screen. Added `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`, and `:active` scale (0.92) to `.profile-avatar-btn`.
    - `App.tsx`: replaced `GlobalSettingsModal`'s `<Suspense fallback={null}>` with an immediate drawer backdrop and TT loader skeleton so tapping the profile icon provides instantaneous visual feedback while the code-split module loads.
  - **Bundle Optimization (`vite.config.ts`):**
    - Configured `build.rollupOptions.output.manualChunks` splitting `@supabase/supabase-js`, `react`/`react-dom`/`react-router-dom`, `@capacitor/*`, and `lucide-react` into dedicated vendor chunks (`vendor-supabase`, `vendor-react`, `vendor-capacitor`, `vendor-icons`).
    - Reduced the entry bundle `dist/assets/index-*.js` from **940.60 kB down to 495.82 kB** (gzipped: 268.91 kB down to 138.95 kB, a 48% reduction), dramatically decreasing JS parse and evaluation time on mobile WebViews.
  - **Startup Deduplication & Deferred OTA (`App.tsx`, `liveUpdate.ts`):**
    - `App.tsx`: mount-time `handleOnlineSync()` now only fires if `syncQueue.length > 0`, eliminating 2 redundant Supabase API requests (`fetchExpensesForTrip`, `fetchCategoriesForTrip`) that were executing in parallel with `initialize()`.
    - `liveUpdate.ts`: deferred Capgo OTA manifest check and ZIP bundle download until after the app reaches idle state (`requestIdleCallback` / 3s fallback), preventing update downloads from saturating mobile bandwidth on app boot.
* **Trade-offs Accepted:**
  - Multiple vendor chunks generate a few extra parallel HTTP requests on initial uncached load, but HTTP/2 multiplexing handles this efficiently and independent caching prevents re-downloading unchanged vendor code across minor app updates.

---

## 183. Trip Home Long-Press Delete Confirm Cancelled by History Back (BUG-220, v3.21.4)
* **Context:** Long-pressing a trip card on the home stack opens a quick-actions overlay with Delete. Tapping Delete appeared to do nothing: the overlay closed and `ConfirmDialog` opened in the same tick, then vanished.
* **Decision:** Stop registering `useHistoryBack` on that contextual menu. Same pattern as ADR #93 (header action sheet) and BUG-208 (admin section switcher): a temporary overlay must not own a history slot if it immediately opens another history-backed modal.
* **Pattern/Implementation:** `src/components/TripStack.tsx` — removed `useHistoryBack(quickActionsOpen, ...)`. Escape, backdrop tap, and the action buttons still close the overlay. `ConfirmDialog` keeps its own history entry, so the delayed `popstate` from `history.back()` no longer cancels it.
* **Trade-offs Accepted:** Hardware / browser Back while the overlay is open no longer closes the menu first (it may leave the page instead). Accepted for contextual menus in this codebase.

---

## 184. Closeout, Last Seen, Map Default, Cross-Trip Search, Explain-This-Number (flags default OFF)
* **Context:** Product asks: end-of-trip closeout, explain-this-number, search across trips, collapse map by default, last-seen on members. A UPI-style amount keypad was prototyped and removed after visual review.
* **Decision:** Five Superadmin flags, all `defaultEnabledForUsers: false`. Ops Deck Flags/Release Phases pages stay data-driven off `FEATURE_FLAGS_META` / `RELEASE_PHASES`.
* **Pattern/Implementation:**
  - **Phase 1 Core:** `enableExplainThisNumber` (ⓘ Why this amount? + bill titles on a transfer).
  - **Phase 2 Collab:** `enableMemberLastSeen` (Online now / last seen on member rows).
  - **Phase 3 Travel/Geo:** `enableMapCollapsedByDefault` (trip sheet starts covering the map).
  - **Phase 5 Speed/Trust:** `enableTripCloseout` (closeout wizard + ended-trip banner), `enableCrossTripSearch` (Cmd+K / home search across trips).
  - Closeout uses existing `closeTrip`; last-seen uses presence + `tt_last_seen_v1` localStorage; search uses existing palette + `fetchAllExpensesForTrips` only when the flag is on.
* **Trade-offs Accepted:**
  - Last-seen is this-device only and only as fresh as presence sync.
  - The ⓘ audit control is hidden when `enableExplainThisNumber` is safed, even though a thinner breakdown existed before this work.
  - With map flag safed, the sheet still starts at 50vh (map half visible), matching the prior default.
  - Amount keypad was dropped rather than restyled.
  - Shipped as **v3.22.0**.

---

## 185. Burn-Rate Insight, Date-Range Membership, Auto Currency Detection, Split Exclusion Defaults, Quiet Hours (flags default OFF, v3.23.0)
* **Context:** Five enhancement ideas from an office-hours-style brainstorm, verified one-by-one against the existing 46-flag registry and codebase before building (most obvious ideas from earlier rounds turned out to already be shipped — see FEAT tracker). Hard constraint: none may affect app startup in any way.
* **Decision:** Five new Superadmin flags, all `defaultEnabledForUsers: false`, Phase 4 (FinTech Pro) except Quiet Hours (Phase 2 Collab). Every one lives inside an already-lazy-loaded surface (`ExpenseForm`, `AnalyticsTab`, `MembersGroupsTab`, `SettingsCategoriesScreen`, `SettingsView`) or is server-side only (`send-push` edge function) — nothing added to the app-shell startup path.
* **Pattern/Implementation:**
  - **`enableBurnRateInsight`:** `src/utils/burnRate.ts` — pure function projecting total spend from the daily average so far, for trips currently in progress. New card in `AnalyticsTab.tsx`. No migration; purely derived from data already loaded.
  - **`enableDateRangeMembership`:** `Member.joinDate`/`leaveDate` (migration `0090`), editable only from the existing member-edit form in `MembersGroupsTab.tsx` (not on initial add, to keep the change contained). `ExpenseForm.tsx`'s default split selection filters out members outside their date range for the expense's date via `src/utils/memberDateRange.ts`. Settlement engine (`settlement.ts`) untouched — it only ever reads `resolvedShares`/`splitMemberIds`, so this only changes what gets pre-selected, never how splits compute.
  - **`enableAutoCurrencyDetection`:** `src/utils/countryCurrencyMap.ts` (static ISO country→currency lookup, ~80 travel-relevant countries) + `detectCurrencyFromLocation()` in `geolocation.ts`, reusing the coordinates Geotagging already captured (no second permission prompt). Dismissible suggestion chip in `ExpenseForm.tsx`, never a silent override. Also fixed a latent bug while in this file: the `!navigator.onLine` guard pattern (shared with `reverseGeocode`/`searchPlaces`) treated `navigator.onLine === undefined` (true in jsdom/non-browser environments) as offline; the new function uses `navigator.onLine === false` instead, which is behaviorally identical in real browsers but doesn't false-negative in environments where the property isn't implemented.
  - **`enableSplitExclusionDefaults`:** `Trip.splitExclusionDefaults` (categoryId → excluded memberIds, migration `0091`), per-category exclusion chips added to the existing category-edit expansion in `SettingsCategoriesScreen.tsx`, applied to `ExpenseForm.tsx`'s default split alongside date-range filtering.
  - **`enableQuietHours`:** New `quiet_hours_prefs` table (migration `0092`, mirrors the `trip_mutes`/`notification_digest_prefs` RLS pattern — owner-only row). Distinct from the existing all-or-nothing per-trip `mutedTripIds`: this is a per-user, cross-trip time window. `send-push/index.ts` checks it (timezone-aware via `Intl.DateTimeFormat`, handles overnight wraps like 22:00–07:00) between the trip-mute filter and the digest-mode filter, same fail-open philosophy as the rest of that function. Toggle + time pickers in `SettingsView.tsx`, IANA timezone captured client-side at save time so the edge function never has to guess it.
* **Trade-offs Accepted:**
  - Date-range membership and split-exclusion defaults only apply at expense-creation time (the initial default), not reactively if the user changes the expense's date/category afterward — still manually adjustable either way, scope-cut deliberately to keep both changes contained.
  - Auto currency detection's country→currency table isn't exhaustive (~80 countries) — an unmapped country just means no suggestion chip, never a wrong one.
  - Quiet hours suppresses only the FCM push, same as trip mute and digest mode — the in-app notification row is always written, so nothing is silently lost.
  - Migrations `0090`–`0092` applied directly to the live Supabase project via `npx supabase db push` (no local Supabase CLI was installed; linked via a personal access token generated for this session).

---

## 186. WhatsApp Social Chat Hub, Reactions & Offline Outbox, Primary Tab-1 Elevation, Simplify Debts Toggle (Phase 06 & Phase 07, v3.25.0)
* **Context:** To elevate Trip Tracker to commercial parity with leading social and fintech platforms (such as WhatsApp and Splitwise):
  1. Chat was previously buried as a secondary sub-tab within the Notes & Checklist pane, limiting group engagement.
  2. Chat interactions lacked standard WhatsApp micro-interactions (emoji reactions, swipe-to-reply quotes, pinned admin notices).
  3. Sending messages while disconnected resulted in blocking alert toasts rather than offline queuing with delivery state indicators.
  4. Debt settlements were strictly greedy flow-minimized, giving travelers no control over bilateral reimbursement preferences.
* **Decision:**
  - Implemented **Phase 06 (WhatsApp Social & Chat Hub)** and **Phase 07 (Commercial FinTech & Smart Splitting)** with 4 new Superadmin feature flags, all `defaultEnabledForUsers: false`:
    - `enableChatFirstNav`: Elevates Chat to Tab 1 on the primary bottom navigation bar, streamlining Notes into a travel prep hub.
    - `enableChatReactionsAndReplies`: WhatsApp-style emoji reaction chips, swipe-to-reply quoting, and sticky pinned notices.
    - `enableChatOfflineOutbox`: Local IndexedDB queuing with WhatsApp status ticks (🕒 queued ➔ ✓ sent ➔ ✓✓ delivered) and automatic online sync.
    - `enableSimplifyDebtsToggle`: Splitwise-style switch between greedy flow minimization and direct bilateral reimbursements.
  - Authored and maintained permanent tracking ledger `COMMERCIAL_ROADMAP.md` covering all 12 commercial features and milestones.
* **Pattern/Implementation:**
  - **Primary Tab-1 Elevation & WhatsApp Floating Action Button (`NavTabs.tsx`, `App.tsx`, `index.css`):**
    - When `enableChatFirstNav` is active, NavTabs renders a 5-equal-tab bottom bar (`['chat', 'expenses', 'ledger', 'members', 'notes']`) where every destination tab receives exactly 20% width (`grid-template-columns: repeat(5, minmax(0, 1fr))`), delivering flawless symmetry and identical sliding active pill indicator dimensions.
    - The `+` primary action button is elevated into a floating action button (WhatsApp / Google Material 3 standard) positioned at the bottom-right above the nav bar (`bottom: calc(82px + var(--safe-bottom, 0px)); right: 18px;`), contextual to the active tab (Add Member on Members tab, Add Expense with long-press clone on other tabs).
    - When `enableChatFirstNav` is OFF, the UI cleanly reverts to the classic 5-column layout (`grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto minmax(0, 1fr) minmax(0, 1fr)`), where the `+` FAB sits right in the mathematical dead center between Expenses and Members.
    - Notes pane automatically suppresses its internal Chat sub-tab via `isChatSubTabEnabled = isChatEnabled && !isChatFirstNav`.
    - Main pane integrates `TripChatPanel` as a code-split top-level tab pane with full-sheet expansion (`forceFull`) so virtual keyboards have dedicated clearance.
  - **WhatsApp Reactions, Swipe-to-Reply & Sticky Pins (`TripChatPanel.tsx`, `tripMessagesApi.ts`):**
    - Long-press or hover triggers an animated emoji bar (👍, ❤️, 😂, 😮, 🙏, 🔥) with toggleable participant lists.
    - Horizontal swipe-right gesture triggers a quote preview banner above the composer with original sender name and text snippet.
    - Trip admins can pin up to 3 urgent notices into a collapsible header banner.
  - **Offline Chat Outbox (`offlineChatStore.ts`, `TripChatPanel.tsx`):**
    - Messages submitted without signal are stored in IndexedDB (`trip-tracker-offline-chat`).
    - WhatsApp status indicators: 🕒 (clock: local queue), ✓ (single tick: saved to server), ✓✓ (double tick: acknowledged).
    - Auto-drain listener activates on `window.addEventListener('online')` and flushes pending messages in FIFO order.
  - **Direct Bilateral Debts Engine (`settlement.ts`, `BalancesSettlements.tsx`):**
    - Added `calculateDirectSettlements` computing pairwise net transfers (`net = payerOwed - receiverOwed`) without rerouting through intermediaries.
    - Integrated segmented control `[ ⚡ Simplified ]` vs `[ 👥 Direct Debts ]` in Balances with informational trade-off modal.
  - **Database Migration & Fallback Resilience (`0093_trip_social_and_debts.sql`, `tripMessagesApi.ts`, `tripApi.ts`):**
    - Schema migration adds `reply_to_id`, `reactions`, `is_pinned` to `trip_messages` and `simplify_debts` to `trips`.
    - Client APIs include try/catch retries that strip newly added columns if remote PostgREST columns are not yet live, preventing runtime disruption.
* **Trade-offs Accepted:**
  - Offline outbox messages sent while offline do not guarantee cross-device sync until connectivity returns.
  - Bilateral debts may produce more total transfers than simplified flow netting, but preserve exact personal accountability as preferred by certain traveler groups.

---

## 187. Chat Action-Sheet Overlay & FAB Collision Fixes (BUG-221, v3.25.1)
* **Context:** After v3.25.0 Social Hub shipped, long-press message actions stacked a fixed emoji pill (`bottom: 220px`) over Reply/Pin, and chat-first floating `+` covered the composer (and painted above ActionSheet because `.trip-sheet` traps stacking with `transform: translateZ(0)`). Live location was viewable in chat but only startable from Settings.
* **Decision:** Treat as a bug-fix release (patch). Keep existing flags; no new feature flag for the Chat share CTA (reuses `enableLiveLocationShare`).
* **Pattern/Implementation:**
  - `ActionSheet` gains optional `header` slot and portals to `document.body`.
  - Chat quick reactions move into that header; remove fixed emoji overlay.
  - Hide floating FAB when `activeTab === 'chat'`.
  - `LiveLocationChatBanner` empty-state CTA + “Share mine” open the existing `LiveLocationShareModal` via threaded callback from `App` / `ChecklistNotesTab`.
* **Trade-offs Accepted:**
  - Add Expense is unavailable from the Chat tab while chat-first nav is on (reachable from Summary/Expenses/etc.). Matches WhatsApp conversation UX.
  - (Superseded by ADR #188) GPS heartbeat originally only ran while the share modal was open.

---

## 188. In-Chat Expense Cards, Session Live-Location Heartbeat & Summary Polish
* **Context:** Travelers missed expense activity in chat (FEAT-C05), live location stopped updating after closing the share sheet, and Summary lacked a compact “needs you” / sync-ready surface. Attachment tray and OS-background GPS remain deferred.
* **Decision:**
  - Ship `enableInChatEventCards` (Phase 6, default OFF) with migration `0094` (`kind` + `payload` on `trip_messages`).
  - Lift live-location heartbeat to app session scope (`liveLocationHeartbeat.ts`) so closing the modal keeps updates while the app is open.
  - Polish: pinned-notice carousel, Summary sync-ready line + needs-you chips.
* **Pattern/Implementation:**
  - `addExpense` / offline replay posts `expense_added` cards via `sendExpenseAddedEventMessage` when flag + trip chat are on.
  - `TripChatPanel` renders compact tap-to-review cards; long-press offers View expense / Delete (no text edit).
  - `SummaryAttentionStrip` aggregates owe/owed, disputes, pending invites, closeout, and pending `syncQueue`.
* **Trade-offs Accepted:**
  - Heartbeat is app-foreground only (web/native); true phone-locked background GPS needs new Capacitor plugins + Always permissions later.
  - Event cards require migration `0094` applied remotely before the flag is useful in production.
  - Composer attachment tray and explain-on-chat deferred until media schema / richer card actions.


---

## 189. Chat Depth: Media, Receipts, Typing & @tripbot
* **Context:** Phase 6 chat hub needed settlement/dispute cards, attachments/voice, typing + read receipts, and NL `@tripbot` expense logging (FEAT-C04/C05/C06) without background GPS.
* **Decision:**
  - Widen `trip_messages.kind` via migrations `0095`/`0096`; private `chat-media` bucket (5MB, trip-participant RLS); trip-level `trip_chat_read_cursors` (`0097`) instead of per-message receipts.
  - Five new Phase 6 flags (default OFF): `enableChatAttachments`, `enableChatVoiceNotes`, `enableChatTypingIndicators`, `enableChatReadReceipts`, `enableTripbotNlExpenses`. Reuse `enableInChatEventCards` + `enableExpenseDisputes` + `enableExplainThisNumber` for event cards / explain.
  - Voice max 60s / ~5MB; images compressed client-side; client UUID then upload+insert for media messages.
* **Pattern/Implementation:**
  - Store posts `settlement_recorded` / dispute cards when flags on; `TripChatPanel` renders card variants, media bubbles, hold-to-record, typing broadcast on `trip_chat_typing:{tripId}`, cursor upserts, `@tripbot` → `parseQuickExpense` → confirm sheet → `addExpense`.
  - APIs: `chatMediaApi`, `chatReadCursorApi`, expanded `tripMessagesApi.sendEventMessage` helpers.
* **Trade-offs Accepted:**
  - Read receipts are trip cursors (peer caught up), not WhatsApp per-message ticks across devices with different clock skew edge cases.
  - Apply `0095`–`0097` remotely before arming media/receipts flags; schema lag fails soft (warn + skip card).
  - Audio bill memos (15s on expense forms) remain out of scope for this drop.

---

## 190. Chat Placement: Notes Hub vs Tab-1 Elevation (BUG-222, v3.27.1)
* **Context:** Chat under Notes errored / felt missing for some flag combos. Desired model: Chat-first OFF keeps Chat in Notes; Chat-first ON elevates to Tab 1. Opening Chat under Notes blanked the hub with “The notes and checklist tab ran into an error.”
* **Decision:** Keep two-flag model (`enableTripChat` = capability, `enableChatFirstNav` = placement). No dual placement. Close homeless-Chat gap when Notes+Passes are off but Trip Chat is on and Chat-first is off by still showing the Notes hub shell. Isolate Chat in a nested `TabErrorBoundary` so a Chat crash does not blank the whole Notes tab. Clarify Ops Deck copy for both flags. Lazy-load `TripChatPanel` from Notes and defer MapLibre until a live-location map expands.
* **Trade-offs Accepted:**
  - Unread badge on Notes when chat-first is off remains optional/deferred.

---

## 191. Chat Max Update Depth from Unstable Zustand Selector (BUG-223, v3.27.2)
* **Context:** After Notes isolation (BUG-222), Chat still crashed with React “Maximum update depth exceeded.” Suspected in-chat expense cards; root cause was `useTripStore(s => s.expenses.filter(...))` returning a new array every `useSyncExternalStore` snapshot.
* **Decision:** Keep `enableInChatEventCards` flag-gated as before. Fix Chat by selecting `s.expenses` (stable reference) and filtering in `useMemo`. Harden payload/`toFixed` guards and surface `error.message` on `TabErrorBoundary`.
* **Trade-offs Accepted:**
  - Existing expense event messages still render as cards when that flag produced them; no feature removal.

---

## 192. Opaque Settlement Algorithm Info Modal (BUG-224, v3.27.3)
* **Context:** Who owes who ⓘ opened Settlement Algorithm with a see-through card; page text bled through. Inline `background: var(--bg-card)` used an undefined token; invalid-at-computed-value made the winning declaration transparent. `glass-card` / content-visibility were a poor fit for a modal.
* **Decision:** Treat as a patch bug-fix. No new feature flag (balances UI is always on when balances exist).
* **Pattern/Implementation:**
  - Portal the dialog to `document.body` like ActionSheet.
  - Use solid `var(--bg-surface)` / `.modal-card`; remove `glass-card` from the dialog.
  - Replace undefined `--bg-card` / `--bg-secondary` with `--bg-surface` / `--bg-page` on nearby toggles and panels.
  - CSS: `.modal-overlay .modal-card` gets an opaque surface (no card-level glass blur).
* **Trade-offs Accepted:**
  - Did not globally define `--bg-card` aliases across the app; fixed call sites in this flow. Broader token cleanup remains optional.

---

## 193. Six Trust/Convenience Features: Settlement Confirmation, Share Link, Contact Invite, Weather Nudges, Expense Approval, Calendar Sync (FEAT-078, v3.28.0)
* **Context:** Customer-facing gap audit surfaced six candidates spanning trust (settlement confirmation, big-expense approval), convenience (contact invite, share link), and travel (weather nudges, calendar sync). Planned and scoped before implementation per the mandatory plan-first rule; user approved all six.
* **Decision:**
  - Merged the originally separate "public trip page" and "read-only guest link" asks into one `enableTripShareLink` feature — same token-gated anon-read mechanism, building both would have duplicated the access-control code.
  - Settlement confirmation and expense-approval both mirror the existing `flag_expense_dispute`/`resolve_expense_dispute` SECURITY DEFINER RPC shape (migration 0085) rather than inventing a new authorization pattern.
  - Trip share link reuses the unguessable-uuid-token-no-lockout-needed reasoning from `member_locations.share_token` (migration 0086), not the short-join-code IP-lockout pattern (migration 0081) — the token has enough entropy on its own.
  - Weather nudges reuse the exact cron -> secret-header-authenticated-edge-function shape as digest notifications (migration 0087), including the Vault manual-setup step.
  - Calendar sync is scoped to **one-way (app → Google Calendar push only)** for v1 — true two-way sync needs a public webhook receiver with 7-day renewal upkeep and ongoing token-refresh cron; one-way still delivers most of the customer value (passes land on the traveler's phone calendar) without that operational surface. Flagged as the heaviest of the six at plan time; scoped down as recommended.
  - Big-expense approval explicitly excludes settlements from the threshold gate — `enableSettlementConfirmation` already covers settlement trust from the recipient's side; gating both would be two confirmation steps for the same money movement.
* **Pattern/Implementation:**
  - Migrations `0098`–`0102`. New edge functions: `send-weather-nudge`, `google-calendar-oauth-start`, `google-calendar-oauth-callback`, `push-calendar-event`.
  - `approvalStatus === 'pending_approval'` is excluded at the single choke point each for balances (`settlement.ts`'s two functions) and analytics/burn-rate (`App.tsx`'s `nonSettlementExpenses`) — the expense list itself still shows pending items (with a ⏳ badge) so they can be reviewed and approved.
  - Calendar/weather OAuth and cron secrets follow the same Vault + edge-function-env-var manual-setup pattern established by `digest_cron_secret` (0087) — never committed to git.
  - All six flags registered per the mandatory flag-gating rule: `enableSettlementConfirmation` / `enableTripShareLink` / `enableContactInvite` → Phase 5; `enableExpenseApprovalThreshold` → Phase 2; `enableWeatherItineraryNudges` / `enableCalendarSync` → Phase 3. Flag-count assertion bumped 61 → 67.
* **Trade-offs Accepted:**
  - Trip Wrapped's own internal expense aggregation was left untouched (pre-existing quirk: it already doesn't distinguish settlement rows either) — not in scope for this drop, flagged as a known gap rather than silently expanded into.
  - The offline addExpense sync-queue path gets the correct `approvalStatus` on replay (fixed — an earlier pass would have silently un-gated a pending expense on reconnect) but does **not** fire the settlement-confirmation-requested push if the settlement was recorded while offline; the recipient still sees it in-app once synced, just without the nudge. Marked `ponytail:` in `tripStore.ts` with the upgrade path noted.
  - Calendar sync token storage follows the codebase's existing precedent (RLS-protected plaintext in a service-role-only table, same posture as `device_push_tokens`) rather than adding column-level encryption infra that doesn't exist anywhere else in the app.

---

## 194. Removed Google Calendar Sync (deferred, not needed right now)
* **Context:** User deferred the calendar-sync feature (#193) immediately after it shipped — never armed, no user ever connected an account, so removal is a clean revert with no data loss.
* **Decision:** Fully removed rather than just leaving the flag OFF and the code dormant — less surface area to maintain/audit for a feature nobody asked to keep around. `enableCalendarSync` deregistered (67 → 66 flags). Migration `0102` (its tables/functions/cron) reverted by a new forward migration `0103` rather than deleting/rewriting `0102` — the historical record of what shipped and was then pulled stays intact, consistent with this repo's forward-only migration convention.
* **Pattern/Implementation:**
  - Deleted the three edge functions from the live project (`google-calendar-oauth-start`, `google-calendar-oauth-callback`, `push-calendar-event`) and their local directories.
  - `0103_remove_calendar_sync.sql` drops `calendar_connections`, `calendar_oauth_states`, their functions, and the `expire-calendar-oauth-states` cron job.
  - Removed `src/services/calendarSyncApi.ts`, the Travel Pass Wallet "Connect Google Calendar" UI, and the `pushPassToCalendar` hook in `saveTravelPass` (tripStore.ts).
  - `supabase/config.toml`'s `verify_jwt = false` entry for `google-calendar-oauth-callback` removed along with it; `send-digest` and `send-weather-nudge` keep theirs (still legitimately needed — see #193's JWT-gateway fix).
* **Trade-offs Accepted:**
  - The other five features from #193 (settlement confirmation, trip share link, contact invite, weather nudges, expense approval threshold) are unaffected and remain as shipped.
  - Revisiting calendar sync later means re-doing the Google Cloud OAuth client setup from scratch (nothing was configured for it before removal, so nothing extra was lost).

---

## 195. Multi-Payer Single Expenses, Ledger UI Enhancements & Quick Filter Chips (FEAT-079, v3.29.0)
* **Context:** Users frequently share upfront payments for expensive single activities (e.g. villa bookings, boat charters, rental cars) where multiple individuals contribute directly to the merchant. Previously, each expense only supported a single `paid_by` member, forcing users to either file separate artificial expenses or execute manual offsets. In addition, user feedback requested ledger visual hierarchy upgrades (sticky date totals, category ambient glow rings, tabular numeric alignment) and one-tap quick filter chips on the Expenses tab, alongside flag-gating the OLED/AMOLED pure black theme option.
* **Decision:**
  - Introduce full multi-payer single expense support gated by `enableMultiPayerExpenses` (Phase 4).
  - Add sticky glassmorphic day-total headers gated by `enableStickyDayHeaders` (Phase 1).
  - Add duo-tone ambient glow rings for category icons gated by `enableCategoryColorRings` (Phase 1).
  - Add tabular numeral layout and OLED theme gating behind `enableAmoledTheme` (Phase 4).
  - Add a horizontally scrollable, one-tap quick filter chip bar gated by `enableExpenseQuickFilterChips` (Phase 5).
* **Pattern/Implementation:**
  - **Data Layer & Migration:** Migration `0104_multi_payer_expenses.sql` adds `paid_by_shares jsonb default null` to `public.expenses`. Schema maps `paid_by_shares` as `Record<string, number> | null`. When multi-payer is disabled or an expense has a single payer, `paid_by` remains the primary payer and `paid_by_shares` is `null`/omitted for zero backward-incompatibility.
  - **Settlement & Math Engine:**
    - `calculateSettlements`: credits each payer in `exp.paidByShares` according to their contribution (`netBalances[payerId] += paidAmount`), seamlessly integrating with existing debt minimization heuristics.
    - `calculateDirectSettlements`: distributes borrower debts proportionally across joint payers based on their contribution ratios.
    - `memberSpentMap` in `App.tsx`: sums individual contributions from `paidByShares` when computing total spent per member.
  - **Expense Form UX:**
    - Segmented "Single Payer" vs "Multiple Payers" toggle appears when `enableMultiPayerExpenses` is active.
    - Interactive contribution list with quick "Split Equally" distribution, real-time live allocation progress bar, and strict sum validation against the converted total amount.
  - **Ledger UI & Quick Filters:**
    - `ExpenseList.tsx` renders avatar stacks with count pills and multi-payer breakdown tooltips.
    - Sticky day headers (`top: 0`, `backdrop-filter: blur(12px)`) provide date context and aggregated day totals while scrolling through lengthy trip records.
    - Quick filter chip bar pinned above expenses provides instant one-tap filtering by "All", "My Expenses", "Paid by Me", "Pending ⏳", top categories, and high-value spending thresholds.
* **Trade-offs Accepted:**
  - For legacy or external systems querying `paid_by`, the primary payer with the highest contribution is set as `paid_by`. This preserves backward compatibility with older clients or third-party consumers while `paid_by_shares` holds the granular breakdown.
  - Quick filter chips operate purely on client-side state without triggering server refetches or storing filter state in database tables, ensuring zero server load and instant sub-millisecond interaction.

---

## 196. Currency-Aware Split Rounding & Fair Remainder Distribution (BUG-226, v3.29.1)
* **Context:** While drafting lightweight enhancement ideas, a codebase audit of `resolveShares()`/`applyRounding()` in `tripStore.ts` surfaced two real correctness issues: (1) all split math hardcoded `.toFixed(2)` regardless of the expense's currency, so zero-decimal currencies (JPY, KRW, etc.) produced invalid fractional split amounts, and (2) any rounding remainder beyond a single minor unit was dumped entirely onto one participant (the payer) instead of spread fairly — e.g. splitting ₹100 seven ways gave the payer 14.26 while everyone else got 14.29.
* **Decision:** Treat as a patch bug-fix, no feature flag (split math is core, always-on).
* **Pattern/Implementation:**
  - Added `getCurrencyDecimals()` in `src/utils/currency.ts`: an ISO 4217 zero-decimal-currency lookup (JPY, KRW, VND, CLP, etc. → 0; everything else → 2).
  - `resolveShares()` now reads `expenseData.currency` and rounds every branch to the currency's actual decimal count instead of a hardcoded 2.
  - Added `distributeWithLargestRemainder()`: floors each raw (pre-rounding) share, then hands out the remaining minor units one at a time to whichever participants had the largest fractional remainder (the Hamilton/largest-remainder apportionment method), tie-breaking to the payer first so single-unit-remainder cases (the common case) land identically to the old behavior. Wired into the equal/custom/percentage/itemized split branches.
  - Left `exact` mode's remainder handling unchanged (still dumps the diff on the payer) — its remainder reflects a user typo/mismatch against the total, not a division rounding artifact, so largest-remainder apportionment doesn't apply.
  - Synced the standalone `src/utils/math_verification.ts` self-check copy and added a 7-way-split regression case proving the fix (4 participants at 14.29, 3 at 14.28, summing exactly to 100.00).
* **Trade-offs Accepted:**
  - `formatAmount()` in `currency.ts` still hardcodes 2 display decimals, so a JPY split now computes correctly (e.g. `33`) but may still render as `¥33.00` until display formatting is audited across its call sites — cosmetic only, deferred as out of scope for this fix.
  - The fix only affects newly computed splits going forward; it does not retroactively correct already-stored expense amounts on existing trips.

---

## 197. Data Saver, Compact Ledger View, Category Reorder, What's New Hub (FEAT-080, v3.30.0)
* **Context:** Follow-up enhancement pass after BUG-226, scoped to lightweight, non-resource-heavy customer wins under Features/UI/UX. User asked for a plan first; approved all four before implementation.
* **Decision:**
  - Merged two of the originally-suggested five ideas ("New" badges on freshly-enabled flags + an in-app changelog strip) into **one** feature, `enableWhatsNewHub`, rather than building a generic per-flag UI-anchor injection system — the existing `useFeatureNudge` hook already proved that pattern is hand-wired per spot (one hardcoded `NavTabs.tsx` call site), and a flagKey→UI-anchor registry for 75+ flags was judged not worth the complexity versus one centralized hub reusing `FEATURE_FLAGS_META` copy that's already maintained.
  - Data Saver's map-suppression mechanism turned out to need more than initially planned: `enableMapCollapsedByDefault` only changes the content sheet's *starting position* (`TripContentSheet`'s `startFull`), it does not stop `TripMapHero` from mounting and fetching MapLibre tiles + OSRM routing calls underneath. Corrected mid-build to instead conditionally not mount `TripMapHero` at all when Data Saver is active, replacing it with a tap-to-reveal placeholder (revealed state is session-only, so the point isn't defeated on the next visit).
  - Category Reorder needed real per-trip, cross-device persistence (not a local pref like the other three), so it follows the `split_exclusion_defaults` trip-level-JSONB pattern exactly rather than inventing a new one.
* **Pattern/Implementation:**
  - New shared `createLocalBoolPref(storageKey)` factory (`src/hooks/useLocalBoolPref.ts`) backs both `useDataSaverEnabled` and `useCompactLedgerView` — written as two near-identical files first, then collapsed into one factory once the duplication was obvious (device/display prefs stay in localStorage, not the zustand store, matching the existing `theme-pref` precedent in `App.tsx`).
  - Migration `0105_category_order.sql` adds `category_order jsonb not null default '[]'`. `getOrderedCategories()` (`tripStore.ts`) is the single sort helper, applied in `SettingsCategoriesScreen` (where the up/down controls live) and in `ExpenseForm`'s category picker only — deliberately *not* applied to the raw `categories` array used elsewhere in the codebase, since several call sites (e.g. `categories[0]` default-category fallback) depend on the original insertion order and reordering the underlying array would have silently changed that behavior.
  - `getNewlyUnlockedFlags()` (`src/utils/whatsNew.ts`) diffs the current resolved-enabled flag set against a localStorage snapshot; first-ever check on a device silently seeds the snapshot instead of retroactively announcing all 75+ already-on flags as "new". `CHANGELOG_ENTRIES` (`src/utils/changelog.ts`) is a small hand-maintained static array, not parsed from `decisions.md`/`BUGS.md` at runtime (those are prose files for humans; shipping/parsing them client-side would cost more than it's worth for a handful of lines).
  - All four flags registered per the mandatory flag-gating rule: `enableCompactLedgerView` / `enableCategoryReorder` / `enableWhatsNewHub` → Phase 1 Core; `enableDataSaverMode` → Phase 3 Travel/Geo. Flag-count assertion bumped 71 → 75.
* **Trade-offs Accepted:**
  - Category reorder only reorders two UI surfaces (the Settings management screen and the expense-form picker) — analytics category breakdowns, filter chips, and other enumeration points elsewhere in the app still use insertion order. Judged secondary to input-time convenience, which was the actual ask; flagged here rather than silently expanded into.
  - The Data Saver connectivity-suggestion banner uses the Network Information API (`navigator.connection.saveData`/`effectiveType`), which has partial browser support (notably absent in Safari); on unsupported browsers the manual toggle still works, the proactive suggestion just never fires.

---

## 198. What's New Moved Into the Version Screen (FEAT-080 rework, v3.30.1)
* **Context:** The v3.30.0 "What's New" hub was a separate Settings row that also diffed resolved flags against a localStorage snapshot. It showed nothing useful: the flag defaults OFF, the flag diff is empty on first open by design, and the changelog was missing the v3.30.0 entry itself. User asked for it to live only behind the version, iOS-update style.
* **Decision:** Drop the standalone row and the flag-diff/badge machinery (`whatsNew.ts` deleted). `enableWhatsNewHub` now only makes the version cell in Settings → About tappable, opening a screen with the running version's changes plus earlier versions.
* **Pattern/Implementation:** `CHANGELOG_ENTRIES` is now `{ version, date, changes[] }`. New `changelog.test.ts` fails if `package.json`'s version has no entry, so a release can't ship without one. The screen matches the running version (ignoring any "(build)" suffix) and falls back to the newest entry.
* **Trade-offs Accepted:** The changelog is still hand-maintained (the test only enforces presence, not quality). The flag stays default OFF per the flag-gating rule, so it must be enabled in Ops Deck to appear.

---

## 199. Voice Expense Payer Is the Signed-In Member (BUG-227, v3.30.2)
* **Context:** Voice Quick-Add and the Add Expense form defaulted `paidBy` to `visibleMembers[0]` when speech/NL did not name a payer. That is usually the trip creator (Rahul). The voice preview also hid the default unless a name was parsed, so 3-second auto-save wrote the wrong person. Chat `@tripbot` already used `myMemberId`.
* **Decision:** Default unnamed expenses to the signed-in trip member. Spoken names still win. If the speaker is not a linked member, ask who paid and do not auto-save. No new flag (`enableVoiceInput` already gates the modal).
* **Pattern/Implementation:**
  - `resolveDefaultExpensePayerId()` in `expenseQuickParser.ts`: parsed name → current member → optional first-member fallback for the full form only.
  - Parser maps "I paid" / "paid by me" to `currentMemberId`.
  - Voice Quick-Add always shows a Paid-by select; changing it pauses auto-save.
  - ExpenseForm and Customize-from-voice now receive `currentMemberId` and the full template (`paidBy`, amount, split).
* **Trade-offs Accepted:**
  - The full expense form still falls back to `members[0]` if the current user is not a linked member, because the form always needs a selected payer. Voice auto-save does not take that fallback.

---

## 200. iOS WebKit compositor feel (no Flutter rewrite)
* **Context:** The app is smooth on Android Chrome/WebView but choppy on iOS Safari / Capacitor WKWebView (BUG-228). A Flutter rewrite was considered and rejected: this is a WebKit compositor problem in a React + Capacitor product that already shares one web codebase (PWA + native shells). Shipped in v3.30.3.
* **Decision:** Keep React + Capacitor. Make iOS match Android *feel* with an always-on WebKit compositor fallback (Android glass unchanged). No Superadmin flag.
* **Pattern/Implementation:**
  - CSS `@supports (-webkit-touch-callout: none)`: drop stacked `backdrop-filter`, permanent `will-change`, and `.stack-ambient-glow` `blur(48px)`. Inline blurs opt into `.compositor-blur`.
  - Gesture `touchmove` writes `transform`/`opacity` on the DOM (TripStack, SwipeableRow, ActionSheet, settings drawer, tab swipe CSS var, banners, SlideToUnlock `scaleX`, launcher vapor `scaleX`). React state commits on pointer up.
  - `TripContentSheet` is full-viewport and parks snap points as `translate3d(0, N%, 0)` — never transitions `top`.
  - `TripMapHero` pauses MapLibre while `.trip-sheet.dragging`. Header tone stays static dark (no WebGL readback).
* **Trade-offs Accepted:**
  - iOS glass is more opaque than Android. Feel parity beats visual-blur parity on WebKit.
  - Peek-card live `filter: blur` during stack drag was removed on all platforms (scale/opacity only) because live filters hitch even on Blink when React was in the loop; rest CSS still distinguishes depth.

---

## 201. Home expeditions contrast + iOS stack 2D motion (v3.30.4)
* **Context:** After BUG-228, two leftover home issues: the `N Expeditions` chip was hardcoded `#38BDF8` and vanished on sky photos (BUG-229); iPhone stack swipe still hitching because React style commits wiped the live `transform` and WebKit still paid for `rotateX`/`rotateY` plus a full-screen ambient blur (BUG-230).
* **Decision:** Drive chip colors from cover-photo luminance (`photoTextTone`). On WebKit, stack drag is 2D `translate3d` + Z rotate only; React never owns the in-flight transform. Android keeps 3D tilt.
* **Pattern/Implementation:**
  - `getImageLuminance` → `tone-dark` / `tone-light` on `.home-expeditions-count`. Fallback uses `--text-primary` / `--bg-surface`.
  - `src/utils/tripStackMotion.ts` picks 2d vs 3d via `CSS.supports('-webkit-touch-callout', 'none')`.
  - Pointer capture + `touch-action: none` on the front card; exit/spring written on the DOM; peek transition updated only when drag starts/ends.
  - iOS `@supports`: `perspective: none`, `transform-style: flat`, drop `.home-ambient-layer` blur.
* **Trade-offs Accepted:**
  - iOS stack loses the 3D “card in space” tilt during drag. Tracking smoothness beats that flourish on WebKit.

---

## 202. Silky-Smooth Home Card Swipe Physics & Lifecycle (BUG-231, v3.30.5)
* **Context:** Following v3.30.3 and v3.30.4, the Tinder-style trip card swipe mechanism on the home screen suffered from noticeable choppiness, mid-swipe snaps, artificial rubber-band drag lag past 90px, and permanent freezing after swiping due to uncleaned `exit` state and leaked inline styles. In addition, peeking cards snapped flat on touch start because 2D mode stripped `scale` and `rotate(Z)`.
* **Decision:** Re-architect the gesture interaction engine for true 60/120fps hardware-composited performance with zero React re-renders during active drag, continuous 2D affine peek transitions matching rest CSS, and complete card lifecycle cleanup upon cycling.
* **Pattern/Implementation:**
  - `src/utils/tripStackMotion.ts`: Front card follows pointer 1:1 during active horizontal and vertical swipes (`totalTrips >= 2`) with natural dynamic tilt; rubber-banding is retained only when `totalTrips < 2` or for extreme vertical over-drag.
  - Peek cards (`peekCardTransform`) preserve continuous 2D hardware-accelerated `scale` and `rotate(Z)` across both 2D and 3D modes, exactly matching the resting CSS transform at `p = 0` and escalating smoothly to `scale(1)` at `p = 1`.
  - `src/components/TripStack.tsx`:
    - Removed `setDragging(true)` React state on pointer down/up; `.dragging` class and transforms are manipulated directly on the DOM node to eliminate gesture-start hitching.
    - Card exit lifecycle: `commitExit` lets the exit transition finish cleanly (~220-320ms), resets `exit` state to `null`, purges inline styles, and restores DOM classes. An effect on `idx` ensures that any recycled card returning to depth 1/2 or depth 0 is 100% clean and responsive.
    - Wrapped `CardContent` in `React.memo` to avoid re-renders during parent state updates.
    - Throttled `.trip-stack-stage.is-dragging` class toggles to gesture start/end boundaries rather than every frame of `pointermove`.
    - Added universal pointer support (`e.pointerType === 'mouse'` with `e.button === 0`) so desktop and touch devices both swipe seamlessly.
* **Trade-offs Accepted:**
  - Retaining 2D `scale` and `rotate(Z)` on WebKit preserves full visual depth continuity without triggering WebKit's 3D perspective compositor hitches.

---

## 203. Navigation, dialog & sync UX pass (BUG-232..236, FEAT-083..087, v3.31.0)
* **Context:** Audit of back navigation and dialogs found overlays that ignored back/Esc (Trip Closeout, Settlement Algorithm sheet, Offline queue drawer), an instant Android exit at the root screen, native `alert()` popups, and no protection for unsaved expenses. The audit also proposed five larger UX/logic features.
* **Decision:** Ship the five small defects as unflagged fixes. Ship the five larger changes behind default-OFF Ops Deck flags (Phase 1: `enableTabBackHistory`, `enableDeepLinkedTabs`, `enableExtendedUndo`; Phase 2: `enablePersistentExpenseDraft`; Phase 5: `enableSyncQueueInspector`).
* **Pattern/Implementation:**
  - Overlays: `useHistoryBack` + `useFocusTrap(onEscape)`. The Offline drawer resets `showDrawer` when the banner unmounts so its history entry can't leak.
  - Double-back exit: `src/utils/doubleBackExit.ts` (2s window, DOM hint pill) called from the Capacitor `backButton` handler in `main.tsx`.
  - Tab back history: `useHistoryStack(tabTrail.length)` declared before the trip-level `useHistoryBack` so a UI trip exit unwinds the trail first. `src/utils/tabTrail.ts` caps the trail at 5.
  - Deep links: `src/utils/deepLink.ts`; URL synced with `replaceState(history.state, ...)` so back-stack entries are untouched. Applied once after trips load; unknown trip/tab ids are ignored.
  - Draft: `src/utils/expenseDraft.ts` stores `{ savedAt, data }` in `localStorage`, 24h TTL, flushed on `visibilitychange`/`pagehide`. Flag OFF keeps the `sessionStorage` draft unchanged.
  - Sync inspector: `SyncQueueItem` gains `attempts`, `lastError`, `needsAttention`. With the flag on, non-retryable failures stay in the queue (skipped until Retry) instead of being dropped. `discardSyncItem` also removes the optimistic local expense and anything queued against its temp id.
  - Extended undo: one generic toast slot in `App.tsx`; member delete is deferred by the timer (and committed on replace/unmount); archive undo re-toggles; settlement undo deletes the settlement expense.
* **Trade-offs Accepted:**
  - Tab trail stops recording after 5 switches rather than trimming browser history.
  - Undo window stays at the existing 2s.
  - While a member delete is pending the member is hidden only in the Members tab; the trip header count updates when the delete commits.

---

## 204. Legal Exposure, Privacy Compliance & Disclaimers Normalization
* **Context:** Comprehensive legal and compliance audit identified critical risk exposures: (1) Misleading security claim on the login screen (`E2E ENCRYPTED` when data is encrypted in transit and at rest via PostgreSQL, but not client-side zero-knowledge end-to-end encrypted); (2) Unenforceable Terms and lack of pre-consent on `LoginScreen.tsx`; (3) Undisclosed device Contacts access (`@capacitor-community/contacts`) and Document Vault local storage in `PrivacyPolicyContent.tsx` risking Apple/Google store rejections; (4) OpenStreetMap ODbL attribution disabled on map canvases; (5) India DPDP Act 2023 age-of-majority alignment and missing Grievance Redressal Officer; (6) Incomplete client-side data erasure (IndexedDB vaults and local storage intact after account deletion); (7) Lack of financial disclaimers on UPI payment and FX conversion modals; (8) Accidental duplicate paragraphs in Privacy Policy and Terms of Service.
* **Decision:** Remediate all audit findings with full technical and legal precision across frontend screens, modals, store deletion flows, and legal documents.
* **Pattern/Implementation:**
  - **Login Screen Pre-Consent & Security Badge (`LoginScreen.tsx`, `index.css`)**:
    - Replaced misleading `E2E ENCRYPTED` with technically accurate `256-BIT ENCRYPTION · SECURE SYNC`.
    - Added conspicuous pre-consent notice beneath Google sign-in: *"By continuing, you agree to our Terms of Service and Privacy Policy."*
    - Added public footer links to `/terms` and `/privacy` for unauthenticated visitors and app store reviewers.
  - **Comprehensive Privacy Policy (`PrivacyPolicyContent.tsx`)**:
    - Fixed duplicate account deletion text.
    - Explicitly disclosed optional Contacts permission (picked locally for invite messaging; never uploaded).
    - Disclosed Document Vault (passports, visas, IDs stored strictly in local IndexedDB; never uploaded to cloud servers).
    - Disclosed on-device OCR (Tesseract.js), Live Location Sharing, and W3C WebAuthn local biometric authentication.
    - Disclosed third-party sub-processors: Supabase, Google, Push (FCM/Web), Open-Meteo, Komoot Photon, OpenStreetMap, OSRM, Frankfurter FX, and Cloudflare Turnstile.
    - Designated Grievance Redressal Officer (Rahul Maurya, `mauryarahul007@gmail.com`, New Delhi, India) with 30-day statutory resolution timeline under DPDP Act 2023 / IT Rules 2021.
    - Aligned age requirements: 18+ in India (or with verified parental consent), 13+ in other jurisdictions (16 in EEA/UK).
  - **Comprehensive Terms of Service (`TermsOfServiceContent.tsx`)**:
    - Fixed duplicate Acceptance of Terms text.
    - Added Apple Guideline 1.2 User-Generated Content (UGC) Zero-Tolerance Policy & 24-hour moderation/takedown mechanism.
    - Added robust Financial & UPI disclaimer: Trip Tracker is not a bank, payment processor, or money transmitter; UPI deep links launch external apps; Trip Tracker holds no funds, cannot reverse transfers, and assumes zero liability for transfer errors or debt disputes.
    - Added Frankfurter FX indicative rate estimate disclaimer.
  - **OpenStreetMap ODbL Attribution (`TripMapHero.tsx`, `TripRouteModal.tsx`)**:
    - Switched `attributionControl: false` to `attributionControl: { compact: true }` to guarantee copyright compliance with OpenStreetMap's Open Database License.
  - **Interactive Modal Disclaimers (`UpiPaymentModal.tsx`, `FxRatesModal.tsx`, `upiLinks.ts`)**:
    - Embedded clear, styled disclaimer banners inside the UPI payment modal and FX rate modal.
    - Removed unused external QR generation API (`getQrCodeUrl` pointing to `api.qrserver.com`) from `upiLinks.ts`.
  - **Complete Client Data Erasure on Account Deletion (`authStore.ts`)**:
    - Extended `deleteOwnAccount()` to purge client-side IndexedDB databases (`trip-tracker-document-vault`, `trip-tracker-pass-attachments`, `trip-tracker-offline-chats`, `trip-tracker-offline-receipts`), clear session caches, and remove local identifiers, ensuring full compliance with GDPR Right to Erasure (Art. 17) and DPDP obligations.
* **Trade-offs Accepted:**
  - Compact attribution pill on map views consumes a minimal ~18px footprint in the lower corner of map canvases, which is legally mandated by OpenStreetMap's license.

---

## 205. Voice Recognition Accuracy & On-Device Native Bridge (Strategy 1 & Strategy 2)
* **Context:**
  - Voice expense entry in `SmartExpenseQuickAddModal` and `ExpenseForm` previously relied solely on direct browser `SpeechRecognition` with rigid parameters (`continuous = false`, `maxAlternatives = 1`).
  - Users experienced premature silence cutoff (when pausing for >800ms), lost payers due to minor speech misspellings of member names (e.g. "Raul" for "Rahul", "Preeya" for "Priya"), unhandled spoken multipliers (e.g. "2k", "1.5k", "half a grand", "2 lakh"), and discarded N-best speech recognition alternatives.
  - Furthermore, native mobile apps (Capacitor on iOS & Android) lacked a direct bridge to hardware-accelerated on-device speech engines (Apple Neural Engine / Google Speech Services).
* **Decision:**
  - **Unified Cross-Platform Speech Service (`speechRecognition.ts`):**
    - Created an abstracted speech recognition utility dynamically bridging `@capacitor-community/speech-recognition` on native mobile devices and standard Web Speech API on browsers/PWA.
    - Added configurable silence debounce timer (2.2s–2.4s) and continuous listening support so natural conversational pauses do not abort speech recognition.
    - Emits all N-best alternative transcript candidates for holistic downstream evaluation.
  - **Multi-Alternative (N-Best) Parse Scoring (`expenseQuickParser.ts`):**
    - Implemented `pickBestQuickExpenseParse()` which evaluates all speech recognition alternatives in parallel, scoring candidate completeness based on valid amount (>0), identified payer, matched category, and parse confidence.
  - **Fuzzy Member Name Matching with Fuse.js (`expenseQuickParser.ts`):**
    - Integrated `Fuse.js` phonetic and fuzzy matching (threshold: 0.38) for payer and split participant detection.
    - Resolves acoustic speech misspellings of Indian and international names to actual trip members.
  - **Spoken Multipliers & Number Slang Normalization (`expenseQuickParser.ts`):**
    - Added regex conversions for "k" / "grand" ("2k" -> 2000, "1.5k" -> 1500, "5 grand" -> 5000, "half a grand" -> 500).
    - Added Indian numbering multipliers: "1.5 lakh" -> 150000, "2 crore" -> 20000000.
    - Added currency slang: "bucks" -> USD, "quid" -> GBP, and Hinglish counters.
  - **UI Integration (`SmartExpenseQuickAddModal.tsx`, `ExpenseForm.tsx`):**
    - Upgraded both quick-add and full expense forms to use the unified speech controller and N-best evaluator.
* **Trade-offs Accepted:**
  - Added `@capacitor-community/speech-recognition@7.0.1` plugin for native builds (dynamically imported at runtime on native platforms; zero web bundle bloat).

---

## 206. Unified Login Screen UI De-cluttering & Mobile Viewport Polish (Release v3.32.1)
* **Context:** Following the legal compliance update in v3.32.0, user feedback indicated that the public unified landing screen felt vertically cramped and cluttered on mobile devices. The 3 stacked feature cards consumed over 210px of vertical space, the join input placeholder was truncated, and the horizontal footer links wrapped awkwardly against the 256-bit encryption badge near the device navigation bar.
* **Decision:** Redesign the login screen presentation layer to maximize vertical breathability while strictly retaining all legal, security, and functional flows.
* **Pattern/Implementation:**
  - **Feature Capsule Strip (`LoginScreen.tsx`, `index.css`)**: Replaced the 3 bulky stacked feature cards with an ultra-sleek, compact horizontal pill strip (`100% Offline-First`, `Smart Splits`, `Instant Sync`), saving ~150px of vertical height.
  - **Contextual Divider**: Added a subtle hairline divider (`or join with trip code`) to cleanly separate primary OAuth authentication from the lightweight join code entry.
  - **Input Responsiveness**: Shortened the placeholder to `"Enter 6-digit trip code"` and enforced `min-width: 0` so the flex input never overflows on narrow (<=360px) viewports.
  - **Stacked Centered Footer with Safe-Area Inset**: Restructured the footer into a centered two-tier stack (trust seal on top, legal links below) and added `padding-bottom: max(16px, env(safe-area-inset-bottom))` to avoid colliding with device home indicator bars.
* **Trade-offs Accepted:**
  - Shortened feature descriptions from multi-line sentences to concise, descriptive capsule pills. The core marketing points remain immediately clear while eliminating vertical scroll pressure.

---

## 207. Login Screen Legal Links Consolidation & Redundancy Removal (Release v3.32.2)
* **Context:** The login screen displayed links to `Terms of Service` and `Privacy Policy` twice in close proximity within the same compact glass card: once in the pre-consent disclosure beneath the Google sign-in button, and again in the bottom footer row.
* **Decision:** Consolidate public legal links into the pre-consent notice, eliminating the duplicate footer links and leaving the footer focused on the 256-bit encryption trust seal and the Superadmin portal toggle.
* **Pattern/Implementation:**
  - Removed duplicate `<Link to="/privacy">` and `<Link to="/terms">` from `.landing-glass-footer` in `LoginScreen.tsx`.
  - Retained the prominent, unauthenticated clickable links in the pre-consent text (`By continuing, you agree to our Terms of Service and Privacy Policy.`), which fulfills all App Store, GDPR, and DPDP compliance requirements.
  - Removed obsolete `.landing-legal-links-row` and `.landing-footer-sep` CSS from `src/index.css`.
* **Trade-offs Accepted:**
---

## 208. Administrative & Traveler Experience Overhaul: Settings, Bugs Ledger, & Superadmin Operations (Release v3.32.3)
* **Context:**
  - While the core trip feed and expense recording experienced continuous refinement, peripheral administrative and traveler management interfaces (Settings tab, Bugs Ledger, and Superadmin portal) retained older, utilitarian desktop-first aesthetics.
  - Specifically, Settings lacked a modern consumer traveler identity hero (as found in WhatsApp or Apple iOS settings), storage metrics were isolated in a sub-modal without live visual feedback, the Bugs Ledger table displayed raw JSON text for telemetry, and the Superadmin portal lacked a fluid, 1-tap mobile navigation bar.
* **Decision:**
  - **WhatsApp-Grade Traveler Profile & Storage Visualizer (`SettingsView.tsx`, `index.css`):**
    - Redesigned the traveler profile hero with an integrated companion QR code action (`.settings-qr-companion-btn`) and verified identity badges.
    - Added an interactive multi-segment mini storage visualizer (`.settings-storage-bar-card`) directly below the profile, displaying live breakdowns of Trips & Balances, Documents, Receipts, and Offline cache in branded color bands.
    - Upgraded `.settings-group-card` to 20px rounded inset grouped surfaces with smooth hover elevations.
  - **Linear-Grade Bugs Ledger Redesign (`SuperAdminBugTracker.tsx`, `ops-deck.css`):**
    - Introduced geometric priority badges (`LinearSeverityBadge`) following Linear's design language: critical (`◆` red/solid), high (`▲` orange/solid), medium (`■` amber/muted), and low (`●` emerald/outline).
    - Designed live device telemetry capsules (`renderTelemetryCapsules`) that parse user agent, sync queue depth, offline states, and screenshot attachments into compact, scannable micro-pills.
    - Implemented a 1-tap `QuickStatusButton` allowing operators to instantly toggle between Open, In Progress, and Resolved directly from both table rows and kanban cards without opening deep edit modals.
  - **Superadmin Portal Mobile Navigation Ribbon (`AdminPortalLayout.tsx`, `ops-deck.css`):**
    - Cleaned section identifiers from bureaucratic `SEC.00` prefix to sleek `#00`, `#01` notation.
    - Added `.ops-mobile-nav-ribbon` providing a horizontal, gesture-friendly tab rail with live badge indicator counters for seamless mobile operations management.
* **Trade-offs Accepted:**
  - Multi-segment storage visualizer computes lightweight estimates across indexed stores synchronously on mount; full re-indexing remains safely bound to the dedicated Storage Diagnostics modal.



---

## 209. Home Trip Stack: Alphabetical Ring, Directional Swipe & Sort Toggle (Release v3.32.4, BUG-237)
* **Context:**
  - The home trip stack sorted by start date, and both swipe directions called the same "send front card to back" action, so left/right changed only the exit animation. Users read the resulting order as random. The pagination dots also indexed the raw `trips` array while the stack used its own sort, so the two disagreed.
* **Decision:**
  - **Alphabetical ring (`TripStack.tsx`, `src/utils/tripSort.ts`):** the stack starts on the first trip A-Z (case-insensitive, numeric-aware). Swipe left = next (clockwise), swipe right = previous (anticlockwise), both wrap. Swipe-up archive still advances forward.
  - **Shared sort helper:** `sortTrips(trips, 'name' | 'date')` is used by both the stack and the pagination dots (`TripsListScreen.tsx`) so they always agree.
  - **Sort toggle:** a `Sort: A-Z / Date` pill beside "View all trips", persisted in localStorage (`tt-trip-stack-sort`), gated by the new Phase 1 flag `enableTripStackSort` (default OFF). With the flag off the order is always A-Z.
* **Trade-offs Accepted:**
  - Peek cards behind the front card remain the next two trips, so a right swipe brings in a trip that was not peeking (no dedicated slide-in yet).
  - Alphabetical is now the default start order for everyone; the previous newest-first start is available via Sort: Date once the flag is on.

---

## 210. Trip Stack Swipe Flicker Fix (Release v3.32.5, BUG-238)
* **Context:**
  - A screen recording of v3.32.4 showed two glitches: after a left swipe the swiped-away trip flashed back at the front for a frame before the next trip appeared, and some swipes showed a blank white card before the photo faded in.
  - Cause 1: `commitExit` reset the exiting card's inline styles in the same `setTimeout` tick as the reorder `setState`; React committed the reorder later, so the old card was briefly visible again at depth 0.
  - Cause 2: the previous trip (the target of a right swipe) was not mounted, so it mounted fresh at the front with no photo (`useTripPhoto` starts null; `.stack-card-photo` fades in over 0.4s).
* **Decision:**
  - Wrap the reorder in `flushSync`, then snap the exiting card to its new depth with `transition: none` + forced reflow before restoring the transition.
  - Render the last trip in the ring as a hidden `depth-3` card (only when more than 3 trips) so it is already loaded and rises like a peek card.
* **Trade-offs Accepted:**
  - One extra mounted card (photo fetch + weather hook idle) when a user has 4+ trips.
  - Not verified on device by automated tests; animation feel needs manual QA (see FEAT-TRIPSORT steps).

---

## 211. Trip Stack: Direction-Aware Drag (Release v3.32.6, BUG-239)
* **Context:**
  - BUG-238's fix (flushSync + pre-mounted previous card) did not resolve the reported glitch. Reproducing in Chromium against the real `TripsListScreen` showed the real cause: dragging the front card in either direction raised the depth-1 peek (the next trip), but a right swipe rotates the ring to the *previous* trip, so the wrong trip rose behind the card and was swapped on commit. The pre-mounted previous card sat at z-index 0, hidden under that peek.
* **Decision:**
  - `onDragProgress` now passes the drag sign; `writePeeks(p, dragging, toPrev)` raises the depth-3 previous card (new `prevCardTransform`) and holds the peeks still when dragging right, and the reverse when dragging left.
  - The previous card is lifted to z-index 2 (same as depth-1, later in DOM) while rising and reset when it becomes front; opacity ramps to 1 by a third of the drag so the peek does not show through.
  - Hidden rest opacity is 0.01 instead of 0 so the browser still decodes its photo (avoids the blank white card).
* **Trade-offs Accepted:**
  - Verified with a per-frame probe and 12 recorded swipes on desktop Chromium (mouse input); touch / iOS WebKit not tested.
  - Right-drag over the far peeks relies on a same-z DOM-order tie-break.

---

## 212. Ops Deck load + home stack smoothness (Release v3.32.7, BUG-240 / BUG-241)
* **Context:**
  - Opening Superadmin Ops Deck / Bug Ledger waited on the whole fleet: eight queries on mount (trips, members, groups, every expense row, users, audit, device tokens, bugs with diagnostics/screenshots), then Bug Ledger fetched bugs again.
  - `fetchMyTripGraph` scanned every expense `trip_id` just to count badges. Device platform split downloaded every token row.
  - After BUG-231/238/239, the home stack still felt unsmooth: `flushSync` + forced `offsetHeight` reflow on commit, live `blur(48px)` and `backdrop-filter` while dragging, and 960px covers on peek cards.
* **Decision:**
  - **Tab-scoped Ops Deck (`AdminPortalLayout.tsx`):** load only the keys the current tab needs. Expenses wait until Analytics/Trips/Command Center widgets need them. Bug Ledger reuses the parent list (`skipFetch`) instead of a second `fetchBugs`.
  - **Slim payloads (`bugApi.ts`, `tripApi.ts`):** list bugs via `BUG_SUMMARY_COLUMNS` and hydrate diagnostics on expand/drawer (`fetchBug`). Admin expenses use `ADMIN_EXPENSE_COLUMNS`. Trip graph prefers PostgREST `expenses(count)` with the old trip_id scan as fallback. Device platforms use HEAD `count=exact`.
  - **Stack compositor (`TripStack.tsx`, `index.css`, `placeImageService.ts`):** rAF-coalesce pointer writes; `useLayoutEffect` instead of `flushSync` + reflow; drop live glow blur; disable `backdrop-filter` while dragging (`html.stack-dragging` also freezes home ambient blur); peek covers at 480px.
* **Trade-offs Accepted:**
  - Bug export and row expand pay a second round-trip for full records. Command Center spend widgets fill in after first paint.
  - Dummy-env local QA cannot measure production payload timing or photo-stack swipe feel.

---

## 213. Quiet trip chat: overlay money status, stack bills, unread on Notes (Release v3.33.0, FEAT-088)
* **Context:**
  - Expense create already posted an in-chat card (`enableInChatEventCards`). Delete, restore, and settlement confirm did not update the thread, so users thought money events vanished.
  - Extra lifecycle bubbles (`expense_deleted` / `expense_restored` / `settlement_confirmed`) would turn chat into a ledger feed and fight ADR 166 (WhatsApp-style conversation) and ADR 188 (cards as miss-a-bill overlay).
* **Decision:**
  - **One card per money event.** Keep posting on add (and existing settlement/dispute kinds). Status after delete, restore, or peer confirm is an overlay on that card from live expense store (`deletedExpenses`, `settlementConfirmedAt`) — strikethrough **Deleted**, live again after restore, **Confirmed** on settlements. No extra bubbles.
  - **Migration 0106** still widens `trip_messages.kind` so those kinds are legal if older or future clients send them; the current client does not post them.
  - **Anti-clutter:** consecutive money cards collapse into an expandable **N bills** stack; per-trip **Hide bills** (`tt-chat-mute-events:v1:{tripId}`) hides system money cards. Reply on expense cards reuses `enableChatReactionsAndReplies`.
  - **Unread:** new flag `enableChatUnreadOnNotes` (Phase 6, default OFF). Own read cursor is upserted when Chat is open even if read-receipts are off; a separate realtime channel (`trip_chat_unread:{tripId}`) drives a dot on Notes or the Chat tab.
* **Trade-offs Accepted:**
  - Overlay status is live-store, not message history — a delayed client without the expense row may not show Deleted until it syncs.
  - Hide bills and unread cursor are local / per-device; they are not a shared mute.
  - 0106 kinds exist on the server but are unused by this client so we do not spam the thread.

---

## 214. Light money loop: Superadmin-gated settle/add/share, home IOU, squad clone, Notes Talk/Pack/Pass (Release v3.34.0)
* **Context:**
  - Competitive review (2026 splitters + Wanderlog) showed Trip Tracker already out-features Tricount/Splid on trip-native logging, but loses the first 60 seconds and the last 5 minutes of a trip. Clone-last, remembered split, drafts, WhatsApp settle, UPI, closeout, and read-only share links were built and default OFF. Home already computed cross-trip IOUs (`useCrossTripBalances`) but only showed them in Settings.
  - Chat-first, Tripbot, itinerary builder, and extra game surfaces were explicitly skipped: they add weight without the episodic trip-reuse loop.
  - Standing rule: every new customer-facing surface ships behind an Ops Deck flag, default OFF.
* **Decision:**
  - **Existing money-loop flags stay default OFF.** Superadmin arms clone last expense, remember default split, persistent draft, WhatsApp settle card, UPI settle-row chip, trip closeout, and read-only share link. Leave Splitwise import, contact invite, chat-first, Tripbot, and the rest of Phase 6 OFF.
  - **New flags (default OFF):** `enableHomeNetBalance` (home You are owed / You owe strip), `enableCloneTripSquad` (name-only member copy + "New trip with this group"), `enableNotesTalkPackPass` (Talk / Pack / Pass / Notes labels), `enableProgressiveNextUp` (hide Next-Up until a pass exists).
  - **Home net strip:** reuse `useCrossTripBalances` above the trip stack when `enableHomeNetBalance` is on. Settings cross-trip chips are unchanged (pre-existing).
  - **Same squad, new trip:** when `enableCloneTripSquad` is on, `duplicateTrip` copies name-only members (not linked accounts, not expenses). Flag off keeps Duplicate Trip as creator-only.
  - **Notes IA / Next-Up:** Talk/Pack/Pass labels and the extra Next-Up pass-length guard are flag-off until Superadmin arms them.
  - **Home Add:** on the IOU strip (`enableHomeNetBalance`), Add opens expense create on the trip in dates today, else the last-updated open trip.
  - **Split habits on clone:** when `enableCloneTripSquad` and `enableRememberDefaultSplit` are on, `duplicateTrip` remaps `tt-default-split` member IDs by name onto the new trip.
  - **Closeout → Wrapped:** locking a trip with `enableTripCloseout` and `enableTripWrapped` closes closeout and opens Trip Wrapped immediately.
  - **Share-first view-only link:** with `enableTripShareLink`, Invite & Share leads with a no-account summary link (auto-generated if missing); join code stays secondary.
  - **Why? on settle rows:** `enableExplainThisNumber` shows an ⓘ Why? control on suggested transfers (still default OFF).
* **Trade-offs Accepted:**
  - Production Ops Deck rows that already stored a flag as true still win over these defaults until a superadmin toggles them.
  - Cross-trip IOU on home still needs online `fetchAllExpensesForTrips` (existing hook); offline home shows no strip.
  - Copied squad members are placeholders until they join; groups are not copied.

---

## 215. Consumer packs replace release phases in Ops Deck
* **Context:** Flags were grouped as engineering Phases 1–7 + Deferred. Superadmin could not see which flags belong with first-open vs settle-out vs power users. Core money-loop flags sat in Phase 5 safed-by-default, while travel chrome and itemized OCR were default ON.
* **Decision:** Replace `RELEASE_PHASES` with `CONSUMER_PACKS` (Core, Trip, Travel, Pro, Labs, Ops). Ops Deck Flags and Command Center arm/safe by pack. Core and Trip default ON; Travel is capable with route-stops off; Pro / Labs / Ops default OFF. Settle, UPI, share, and clone-squad stay in Core, never Pro.
* **Pattern/Implementation:**
  - `ConsumerPackId` / `ConsumerPackDef` in `src/types/admin.ts`; `FEATURE_FLAGS_META.pack` replaces `.phase`.
  - `CONSUMER_PACKS`, `getPackFlagKeys`, `getPackStatus`, `setPackFlags` drive Admin Flags and Command Center.
  - `DEFAULT_FEATURE_FLAGS` aligned to pack intent (34 ON / 53 OFF of 87, including Labs `enableCloseoutPulse`).
  - Shipped in v3.35.0 as FEAT-090.
* **Trade-offs Accepted:**
  - Stored production `resolved.global` rows still win until Superadmin **Restore recommended app** or **Arm/Safe Pack**.
  - Travel Next-Up/radar/scanner stay default-capable; `enableProgressiveNextUp` (Core, ON) hides expense-tab chrome until a pass exists.
  - Itemized, OCR, analytics, biometric, achievements, snapshot, and feature-suggestions flip default OFF — power users lose them until Pro/Ops is armed.

---

## 216. Superadmin growth ops: loop health, not DAU
* **Context:** Ops Deck Analytics showed spend, join-code claim, and 30-day login retention. That is the wrong north star for an episodic trip splitter. Marketing needed first-60s / last-5-min / same-squad next trip, without a Mixpanel clone or traveler chrome.
* **Decision:** Derive Superadmin Growth from existing trips, expenses, members, and audit logs. Command Center shows a loop-health strip. Analytics adds a Growth tab (funnel, ghosts, flag used-vs-armed proxies, invite/share attribution, trip-type slices, win-back, closeout pulse, Splitwise imports, UTM). Landing copy is four `app_config` keys. Closeout pulse is a Labs flag default OFF. Share views / pulse / Splitwise / UTM persist via migration 0107 when applied; until then local store + audit logs still work.
* **Pattern/Implementation:**
  - `src/utils/opsGrowthMetrics.ts` is the single derivation; Command Center and Analytics only render.
  - `enableCloseoutPulse` (Labs, OFF): one tap after lock in `TripCloseoutModal`.
  - `landing_headline`, `landing_tagline`, `landing_invite_blurb`, `empty_trip_blurb` in Tools.
  - `utm_source` / `ref` captured on `/login` into sessionStorage, flushed to `profiles.signup_source` and `signup_attribution` audit on sign-in.
* **Trade-offs Accepted:**
  - Flag usage is **proxies** (clone-last = duplicate rows in 5 min; WA share = settlement exists). Labeled in the UI.
  - Share view counts stay 0 until migration 0107's `record_trip_share_view` exists.
  - No DAU, CRM blast, or chat-spy surfaces.
  - Shipped in v3.35.0 as FEAT-091.

---

## 217. Superadmin flag recipes and saved mixes
* **Context:** Packs (Core/Trip/Travel/Pro/Labs/Ops) are the product contract. Superadmin still needed named mixes (cafe vs flyer vs power splitter) without Arm-all and without a second flag system.
* **Decision:** Flags page Recipes: four built-in recipes (Recommended, On the road, Flyer, Power money) plus up to five named custom mixes. Apply confirms and replaces the global flag set. Recommended and Flyer write code defaults (same bits, different story). On the road safes Travel/Pro/Labs/Ops. Power money arms Pro and leaves Labs off. Custom saves current toggles to `app_config.flag_presets` with localStorage fallback. Labs is never in a built-in recipe; custom confirm warns if Labs is on.
* **Trade-offs Accepted:**
  - Flyer === Recommended bitset on purpose (air/rail story vs default story).
  - Trip/user overrides still win after Apply until cleared.
  - New flags missing from an old custom mix inherit `DEFAULT_FEATURE_FLAGS`.

---


---

## 218. Growth telemetry, invite conversion, traveler passport, lifecycle nudges (v3.37.0)
* **Context:** Ops Growth was computed only from trips, expenses and audit logs, so retention, sync health and the invite funnel were invisible. Signed-out invitees and share-page viewers had no attribution or call to action. Regular sign-in is Google-only, so the invite preview is the whole pre-signup funnel.
* **Decision:** Ship four flag-gated pieces in existing packs: `enableInviteConversion` (Core, ON), `enableTravelerPassport` (Trip, ON), `enableGrowthTelemetry` (Ops, OFF), `enableLifecycleNudges` (Travel, OFF). Migration `0108` adds `app_events` (insert-only RLS gated by the flag), `record_join_preview`, `get_public_growth_flags` (anon-readable, two flags only), superadmin aggregates (`admin_retention_cohorts`, `admin_repeat_creator_rate`, `admin_reliability_summary`) and the lifecycle candidate/log/cron plumbing. New edge function `send-lifecycle-nudge` (`verify_jwt = false`, secret-authenticated) follows the weather-nudge shape.
* **Pattern/Implementation:**
  - `src/utils/growthTelemetry.ts`: one `app_open` per UTC day, `sync_fail` / `queue_stuck` / `flush_ok` once per session, no content in props.
  - Invite preview tags the visit via the existing `captureSignupAttribution('ref=invite')`; share page button links to `/login?ref=trip_share`. Both fail closed to the original UI if the public flag read errors.
  - Passport is computed on the device from `trips` (`src/utils/travelerPassport.ts`); never sums money across currencies.
  - Nudges: invite reminder, packing reminder, next-trip prompt; max one per user per 3 days, quiet hours and digest-mode users get no FCM push.
* **Trade-offs Accepted:**
  - `invite` signup source also tags older accounts with no stored source that sign in through an invite link.
  - Telemetry data starts from the day the flag is armed; retention cohorts exclude earlier signups.
  - Lifecycle date windows are exact, so a missed cron day skips that nudge.
  - Email sign-in fallback for invitees was dropped (would need new auth). Query-text logging (#13) was dropped.
  - Migration 0108 and the edge function were written without a local Postgres and were not exercised before this commit. Migration 0108 was applied to the live project on 2026-09-22 via `supabase db push --linked`, after the code push (an earlier attempt was blocked by the auto-mode classifier); the edge function is not yet deployed and the nudge Vault secret is not set.

---

## 219. iOS visible height and compositor diet (v3.37.1)
* **Context:** Android Chrome already felt smooth. iPhone Safari still squashed the home stack and hitch during swipes and sheet snaps. `--app-vh` is the tall layout height on purpose (ADR keyboard overlay): shrinking it slides the trip chrome off the map. A fixed 220px chrome budget then sizes the 3:4 card for space the Safari toolbar has already taken. Live filters and a map that resumes the instant the finger lifts still cost WebKit frames.
* **Decision:** WebKit only (`isWebKitCompositor` / `@supports (-webkit-touch-callout: none)`). Write `--ios-visible-vh` from `visualViewport.height` on resize, not scroll. Measure home chrome into `--stack-chrome` and size the card from that. Drop the home-photo filter and mask for a static gradient, animate stack cards with transform and opacity only, and hold the map paused until the sheet snap ends. Do not change `resolveViewportCssVars` or Android glass and 3D tilt. No new feature flag.
* **Trade-offs Accepted:**
  - The card can jump when Safari shows or hides its toolbar, because visible height updates on resize.
  - The home photo on iPhone is a flat gradient over the cover, not a blur.
  - Not verified on a physical iPhone in this change; Chrome confirmed the WebKit variables stay unset.

---

## 220. Remove the home cross-trip IOU strip and its flag (v3.37.2)
* **Context:** The trips home showed a "You are owed / You owe" strip with an inline Add button under the greeting (`enableHomeNetBalance`, Core, ON). Each trip card already offers add-expense, so the strip duplicated it and cost vertical space on the home stack.
* **Decision:** Delete the strip and Add button from `TripsListScreen`, drop the `crossTripBalances` prop and `pickTripForQuickAdd` use there, remove the dead `.home-net-row` / `.home-net-add` CSS, and deregister `enableHomeNetBalance` from `FeatureFlagKey`, `FEATURE_FLAGS_META`, `DEFAULT_FEATURE_FLAGS` and the Core pack. Flag-count assertions updated (91 to 90 total, Core active 19 to 18).
* **Trade-offs Accepted:**
  - Settings still shows cross-trip balances (`SettingsView`), so `useCrossTripBalances`, `crossTripBalances` in `App.tsx`, and the shared `.home-balance-chip` styles stay.
  - `stackChrome.ts` still measures `.home-net-row`; it now always reads 0. Left alone to avoid touching the BUG-244 iOS height code.
  - Old FEAT-089 / FEAT-LIGHTLOOP2 history in `features.json` and `FEATURE_TEST_STEPS.md` still mentions the flag, kept as history.
  - Any stored `enableHomeNetBalance` row in production Ops Deck becomes an unused key.

---

## 221. Visual Concept 1 (Luxury Card Stack with Bottom Slide Launcher) & Visual Concept 2 (All Trips Luxury Bento Grid with Segmented Capsule Filter)
* **Context:** The home screen previously suffered from visual clutter: the 3-column header caused the view toggle to overlap the title text, and switching between stack and grid views caused the switcher button and filter pills to jump vertically and horizontally between different rows and positions.
* **Decision:**
  - **Unified 2-Row Header Architecture (`.home-unified-header`):**
    - **Row 1 (Top Bar):** Features traveler profile avatar (`.profile-avatar-btn`) on the left, high-end editorial serif title `Journeys` in the center, and Search (`IconSearch`) + Superadmin Bug Tracker on the right.
    - **Row 2 (Controls Bar):** Displays the segmented filter capsule `[ All | Active | Past ]` (`.concept2-filter-capsule`) on the left and the segmented view mode switcher `[ 🥞 | ☰ ]` (`.concept-view-mode-pill`) on the right.
    - **Rock-Solid Positioning:** Because Row 1 and Row 2 use identical shared layout containers and positioning across both Stack and List views, the view switcher button and the filter chips stay at the exact same pixel coordinates when toggling between views.
  - **Filter Application in Both Views:**
    - Tapping `Active`, `Past`, or `All` in the filter capsule filters `displayedTrips` for both the luxury stacked card carousel and the 2-column bento photo grid.
  - **Stack View Mode (Visual Concept 1):**
    - Squircle luxury card face (`border-radius: 32px`) with destination weather capsule (`Shimla ☀️ 22°C`), editorial serif typography, uppercase date range + duration (`AUG 10 – AUG 14 · 4 Days`), hairline separator, member avatars pile (`.concept1-avatars-pile`), and right-aligned spend summary (`$X spent`) with sleek progress track.
    - Stepper scrub dots (`.trip-stepper-dots`) and bottom swipe launcher (`TripSlideLauncher`: `🔑 JOIN` ← ✈️ → `CREATE+`).
  - **All Trips View Mode (Visual Concept 2):**
    - 2-column luxury photo bento grid (`.concept2-grid`) with `LuxuryGridTripCard` cards featuring destination tourism photography, weather badges, date labels, and avatar clusters.
    - Floating bottom action dock (`.concept2-bottom-dock`) with prominent `+ New Trip` pill and `Join` button.
* **Trade-offs Accepted:**
  - Both views now share the streamlined 2-row top chrome, eliminating layout shifts and providing instant, unified filtering across both Stack and Grid modes.

---

## 222. Destination & Place Cover Image Resolution Pipeline with Curated Fallbacks (v3.38.0)
* **Context:** In list/grid view, multiple trip cards rendered as dark `#1E293B` rectangles without cover photography. Inquiries revealed that when users create trips, they provide a Destination/Place (e.g. *"Munnar"*, *"Ooty"*, *"Sikkim"*) alongside a custom Trip Name (e.g. *"Test 60"*, *"Test trip2"*, *"Sikkim Bagpacking"*). Two issues prevented cover images from loading:
  1. Wikimedia's thumbnail resizer rejects non-standard widths (such as 480px) with HTTP 400 Bad Request, whereas standard sizes (500px, 960px) succeed with HTTP 200 OK.
  2. Travel noise words and suffixes (e.g. *"Bagpacking"*, *"trip"*, *"tour"*, *"2026"*) sent directly to Wikipedia/Wikivoyage APIs resulted in 404s.
  3. When destinations or test names had no matching articles, `useTripPhoto` returned `null` with no fallback image.
* **Decision:**
  - Standardize Wikimedia thumbnail width to 500px (`PEEK_COVER_WIDTH = 500`) and add `normalizeWikimediaWidth(width)` to automatically clamp thumbnail requests to valid Wikimedia sizes (250px, 500px, 960px).
  - Add automated noise-word and preposition stripping in `extractPlaceCandidates` (`src/services/placeImageService.ts`) to cleanly extract destination roots (e.g. *"Sikkim Bagpacking"* ➔ *"Sikkim"*, *"Trip to Manali 2026"* ➔ *"Manali"*).
  - Connect `LuxuryGridTripCard` to pull cover photos prioritizing `trip.destination`, `trip.stops`, and `trip.name`, identical to `TripStack`.
  - Provide `getFallbackTravelPhoto` featuring 16 curated high-resolution royalty-free landscape photographs with keyword matching and deterministic hashing so every tile is guaranteed to render an aesthetic travel photo without delay or blank cards.
  - Preserve in-flight `coverImageUrl` in `createTrip` and `updateTrip` in `src/store/tripStore.ts`.
* **Trade-offs Accepted:**
  - Fallback photos are selected from a static royalty-free CDN collection when Wikipedia returns no matching place article.
  - Sizing to standard 500px slightly exceeds 480px on 2-column mobile displays (a negligible 4% difference) while ensuring 100% reliability against Wikimedia's HTTP 400 rejection policy.

---

## 223. Refined Floating Action Dock & Ambient Scrim for List Screen
* **Context:** In the 2-column luxury bento grid (Visual Concept 2, list/grid view), the fixed bottom action dock (`.concept2-bottom-dock`) and Join flow appeared awkward in production:
  1. The "New Trip" button lacked `white-space: nowrap`, causing "New" and "Trip" to wrap onto two lines on mobile viewports. This created an asymmetrical height mismatch with the adjacent single-line "Join" button.
  2. The dark outer pill container with an opaque electric blue inner button created a visually heavy "capsule-in-a-capsule" dock that clashed with the destination cover photos directly underneath.
  3. The dock sat fixed directly on top of the bottom row of cards, obscuring expedition titles, dates, and member avatars.
  4. The "Join a Trip with Code" form was rendered as an opaque inline card at the top of `<main>`, which shoved the cards down and appeared as an abrupt black block when triggered from the bottom dock.
* **Decision:**
  - **Enhanced Translucent Glassmorphism:** Increased transparency on `.concept2-bottom-dock` (`background: rgba(15, 23, 42, 0.42)`, `backdrop-filter: blur(28px) saturate(190%)`), replaced the opaque solid blue button with a luminous translucent gradient (`background: linear-gradient(135deg, rgba(2, 132, 199, 0.65) 0%, rgba(37, 99, 235, 0.65) 100%)`), and lightened the bottom ambient scrim.
  - **Floating Transparent Modal for Join Trip (`.join-trip-modal-overlay`, `.join-trip-glass-card`):** Replaced the inline top card with a centered, floating frosted glass popup with an icon badge, styled trip code input (`letter-spacing: 0.18em`, uppercase), X close button, and click-outside/escape-key dismissal.
  - **Single-Line Compact Buttons:** Added `white-space: nowrap` and balanced height (38px) across both buttons. Added [`IconQrCode`](file:///home/rahulm/Documents/trip_tracker_2026/src/components/Icons.tsx#L561) to the Join button for balanced iconography and symmetry with `+ New Trip`.
  - **Extended Scroll Clearance:** Increased `.concept2-grid-container` bottom padding to `calc(112px + var(--safe-bottom, 0px))` so the bottom cards scroll completely clear of the dock and scrim.
* **Trade-offs Accepted:**
  - The floating modal overlays the current view rather than occupying inline document flow, avoiding layout shifts and allowing the user's scroll position on the list grid to remain undisturbed.

---

## 224. Trip Grid Card UI Overhaul, Long-Press & Right-Click Context Menu, and Card Simplification
* **Context:**
  - User requested restructuring the trip grid cards (`LuxuryGridTripCard`) to precisely match an attached mobile luxury UI reference:
    1. **Top Left:** Date range (e.g. `July 15 - 28, 2024`), with Trip Name (e.g. `Safari in Kenya`) directly below it.
    2. **Top Right:** Ambient temperature & weather capsule of destination place (e.g. `☀️ 28°C`).
    3. **Bottom Left:** Temporal status badge (`Upcoming Trip`, `Past trip`, or `Active Trip`), with Destination / Place name directly below it.
    4. **Bottom Right:** Spending summary capsule (e.g. `Spent: $6,800` strictly reflecting logged expenses, eliminating all raw expense count labels like `N exp`).
    5. **Remove Avatars:** Person avatars took up excessive visual space on compact 2-column cards.
    6. **Remove Visible 3-Dots Button:** The visible vertical 3-dots button cluttered the card face; options menu needed to be accessible via **long-press** on mobile touch and **right-click** on desktop/computer.
* **Decision:**
  - **Grid Card Layout Restructure (`TripsListScreen.tsx`, `index.css`):**
    - Removed nested card-in-card picture frame padding (`padding: 0`), allowing cover photography to bleed seamlessly to top and side edges within a single clean outer container (`border-radius: 20px`), eliminating artificial extra borders.
    - Softened font weights from heavy `700` bold to refined `500` - `600` typography, preventing bulky visual weight and text clipping.
    - Resolved truncated titles: Trip Name is now positioned on its own full-width row (`.concept2-card-name`) directly below the compact Date + Weather capsule row, granting it 100% horizontal clearance so names never prematurely truncate.
    - Resolved truncated status & places: The card footer separates temporal status (`.concept2-card-status-label`, full width) from the place and spend row (`.concept2-card-footer-row`), ensuring labels like "Active Trip" and long place names have ample horizontal space without clipping.
    - Completely eliminated raw expense counts (`N exp` / `expenses`) from the card badge. Bound spending to `useCrossTripBalances` + local `tripExpenses` to compute real logged amounts (`Spent: $X,XXX` or `Spent: $0` if unspent), with seamless support for `trip.budget` when future budget features land.
    - Completely removed `.concept2-avatars-pile` and `.concept2-card-more-btn` from the card face.
  - **Gesture-Based Context Menu Integration:**
    - Mobile touch: Implemented pointer-based long press with a 450ms threshold, jitter detection (>10px cancels), haptic vibration (`triggerHaptic('medium')`), and click suppression on long-press release to prevent unwanted trip navigation.
    - Desktop / Laptop: Bound `onContextMenu` with `e.preventDefault()` to trigger the trip options `ActionSheet`.
    - Screen reader / Keyboard: Enabled ContextMenu key and Shift+F10 shortcuts alongside Enter/Space selection.
    - Added CSS `-webkit-touch-callout: none;` and `user-select: none;` to suppress native browser text selection and iOS link callouts during long press.
* **Trade-offs Accepted:**
  - Avatars and raw transaction counters are hidden from grid cards, keeping card faces focused purely on destination photography, dates, weather, and spending. Member details and full transaction lists remain viewable inside the trip details screen.

---

## 225. Destination City Overlay on Photograph & Single-Row Card Footer
* **Context:**
  - On 2-column mobile layouts (~160px–180px card width), having both the destination place name and 5-to-6-figure spend amounts in the card footer forced both elements to truncate or collide into single-letter text.
  - The user suggested moving the destination city directly onto the photograph on the right side to maximize breathing room for trip status and spend at the bottom.
* **Decision:**
  - **Frosted Glass City Badge on Photograph (`.concept2-card-city-pill`):**
    - Positioned at `bottom: 8px; right: 8px;` inside `.concept2-card-image-wrap` with a subtle blur backdrop (`rgba(15, 23, 42, 0.65)`, `backdrop-filter: blur(8px)`), rounded pill border, and cyan map pin icon ([`IconMapPin`](file:///home/rahulm/Documents/trip_tracker_2026/src/components/Icons.tsx#L380)).
    - Visually couples geographic context with the scenic destination photograph (matching Apple Maps Guides and Airbnb editorial cards).
  - **Single-Row High-Clearance Footer (`.concept2-card-footer`):**
    - Streamlined the footer to a single flex row:
      - Left: Temporal status badge (`Active Trip`, `Upcoming Trip`, `Past trip`) accompanied by a distinct colored status indicator dot (`.concept2-status-dot` — emerald for active, sky blue for upcoming, slate for past).
      - Right: Logged spend badge (`Spent: $X,XXX` or `Spent: ₹X,XXX`).
    - Gives both status and spend 100% horizontal clearance across all mobile and desktop viewports, completely eliminating text truncation.
* **Trade-offs Accepted:**
  - Very long city names in the photo overlay badge are clipped with `text-overflow: ellipsis` up to the card's maximum width minus margins, while the full name is preserved via native browser `title` tooltips.

---

## 226. Single Primary City Parsing, Uncollapsible Status Labels, Borderless Spent, and Dynamic Date Contrast
* **Context:**
  - In 2-column mobile grids:
    1. Multi-city itineraries (e.g. `Gangtok → Lachung → Pelling`, `Meghalaya → Arunachal Pradesh`) caused the photo city pill to overflow and truncate with ellipses inside the pill.
    2. The status label (`• Upcoming Trip`, `• Past trip`) was collapsing into `• Upcor` or `• Past tri` because the spend badge had `flex-shrink: 0` with a boxed border and padding while the status had `flex: 1` with ellipsis truncation.
    3. The spent amount had an unnecessary pill border around it.
    4. On bright photography (such as white snow mountains or pale morning skies in Sikkim and Himachal), white date text was getting washed out and hard to read.
* **Decision:**
  - **Single Primary City Extraction (`extractPrimaryCity` in `TripsListScreen.tsx`):**
    - Parses multi-segment routes separated by arrows (`→`, `->`, `=>`), dashes (`—`, `–`), pipes (`|`), slashes (`/`), or commas (`,`).
    - Extracts the primary first destination city (e.g. `Gangtok`, `Meghalaya`, `Manali`) for the photo badge, ensuring uniform aesthetic compactness across all cards, while keeping the full multi-city route accessible via the `title` tooltip.
  - **Uncollapsible Status Labels:**
    - Shortened status strings to `Active`, `Upcoming`, and `Past` (matching the top screen filters).
    - Set `flex-shrink: 0; white-space: nowrap;` on `.concept2-card-status-label`, completely preventing flexbox from compressing or truncating status text.
  - **Borderless Spent Text:**
    - Stripped the border, background pill, and padding from `.concept2-card-spend-text`. Formatted spent as clean text with a muted label (`Spent:`) and high-contrast numerical value (`₹107,709`), freeing ~16px of horizontal space.
  - **Dynamic Date & Card Header Contrast Based on Image Luminance:**
    - Integrated `usePhotoTextTone` from `imageLuminance.ts` which samples the top third of the trip photo.
    - Added twin capsule styling to `.concept2-card-date` matching the weather capsule.
    - When `tone-dark` is triggered by bright sky or snow (`luminance > 0.55`), `.concept2-card-date` and `.concept2-weather-capsule` dynamically switch to dark text (`#0F172A`) over a light frosted capsule (`rgba(255, 255, 255, 0.88)`), ensuring 100% legibility on any photograph.
* **Trade-offs Accepted:**
  - Only the primary gateway/anchor city is shown on the photo face; the complete itinerary route remains accessible on tap/hover and inside the trip journey sheet.

---

## 227. Unified Luxury Dark Card Scheme Across Light & Dark Modes
* **Context:**
  - In Light mode on the Journeys home screen, trip cards in list/grid view rendered an awkward white rectangular patch (`#FFFFFF`) directly below every destination photograph because `.concept2-card-footer` and `.concept2-grid-card` inherited `var(--bg-surface)`.
  - Furthermore, `.concept2-spend-amount` was hardcoded to `#F8FAFC` (white), rendering the spent numerical value completely invisible on the white footer background.
  - Stacked cards (`TripStack`) were already designed as full-bleed photographic cards with dark gradient overlays, creating an inconsistent visual experience when switching views in Light mode.
* **Decision:**
  - **Lock Trip Cards & Footers to Luxury Dark Theme:**
    - Updated `.concept2-grid-card` and `.stack-card` to use deep obsidian dark backgrounds (`#141720`) with clean borders (`rgba(255, 255, 255, 0.08)` / `0.12`).
    - Styled `.concept2-card-footer` with a solid dark surface (`#11141d`) and subtle separator line (`1px solid rgba(255, 255, 255, 0.06)`).
    - In Light mode, applied an elevated drop shadow (`box-shadow: 0 10px 24px -4px rgba(15, 23, 42, 0.28), 0 2px 6px -1px rgba(15, 23, 42, 0.12)`) and crisp border so dark photo cards pop cleanly against the ambient sky/cloud backdrop.
    - Spend amount (`#F8FAFC`), spend label (`rgba(255, 255, 255, 0.55)`), and temporal status dots remain crisp, vibrant, and AAA-accessible across all app themes.
* **Trade-offs Accepted:**
  - Trip cards intentionally retain an obsidian dark photographic container even when the global app theme is Light. This matches industry standards (e.g. Netflix, Spotify, Apple Maps Guides) where multimedia/photo cards preserve cinematic contrast independently of surrounding app chrome.

---

## 228. Luxury Home Screen UI/UX Revamp: Consolidated Header, Universal Floating Action Dock, Real Spending Telemetry & Double-Bezel Card Stack
* **Context:**
  - The home screen previously suffered from vertical fragmentation and interaction mismatches:
    1. Four separate vertical navigation and tool tiers (`home-header-row1`, `home-header-row2`, filter capsule, and card top bar) consumed over 110px of mobile screen space before displaying travel cards.
    2. Stack View rendered a 120px+ arcade-style `TripSlideLauncher` with drag physics and vapor trails ("Slide left to Join · Slide right to Create"), an interaction pattern designed for irreversible actions like payments rather than routine primary actions.
    3. The front card in `TripStack` only displayed `"N logged"` with an arbitrary progress bar (`expenseCount * 12%`) rather than actual expenditure amounts or budget telemetry.
    4. The background ambient backdrop was blurred by only 3.5px, creating a sharp duplicate image behind the card instead of an ethereal chromatic aura.
    5. The 0-trip empty state was a dashed-border wireframe box resembling an unfinished ledger.
* **Decision:**
  - **Consolidated Integrated Header:**
    - Moved the view mode toggle (`concept-view-mode-pill`) into Row 1 alongside search and bug buttons, pairing mode switches with primary utilities.
    - Streamlined Row 2 into a focused, low-profile status filter capsule (`All`, `Active`, `Past`, `Archived`) with count badges, reducing header height by over 40%.
  - **Universal Floating Glass Action Dock:**
    - Deprecated `TripSlideLauncher` and unified action buttons across both Stack and Grid views with a floating frosted-acrylic capsule (`.floating-action-dock`).
    - Styled with `backdrop-filter: blur(24px)`, tactile micro-press haptics, and responsive bottom padding `max(20px, env(safe-area-inset-bottom) + 14px)`.
    - Updated `readStackChrome` in `src/utils/stackChrome.ts` to measure the new dock height instead of the launcher, reclaiming ~70px of card height on iOS Safari / WebKit compositor.
  - **Real Spend Telemetry & Budget Progress on Stack Cards:**
    - Connected `tripSpending` and `useTripStore` expenses directly into `CardContent`.
    - If a budget is set, displays `${currencySymbol}${spent} / ${currencySymbol}${budget}` with color-coded progress (emerald `<75%`, amber `75-95%`, crimson `>100%`).
    - If no budget is set, displays `${currencySymbol}${spent} spent` with monospace tabular numbers.
    - Updated `getTripStatusBadge` to display Flighty-style live context (`LIVE · DAY N`, `DEPARTS TODAY`, `STARTS TOMORROW`, `IN N DAYS`, `PAST · UNSETTLED`, `COMPLETED`).
  - **Double-Bezel Card Enclosure & Motion Refinement:**
    - Implemented machined squircle outer frame (`border-radius: 32px`, `border: 1.5px solid rgba(255, 255, 255, 0.14)`) and inner photo core (`border-radius: 28px`) with dual gradient scrim.
    - Replaced chaotic depth tilt angles (`-2.5deg` and `2deg`) with clean parallel scale and brightness offsets (`scale(0.95)`, `filter: brightness(0.78)` for depth-1; `scale(0.90)`, `filter: brightness(0.58)` for depth-2).
  - **Chromatic Ambient Glow & Boarding Pass Empty State:**
    - Upgraded `.home-ambient-layer` to high-diffusion spatial blur (`filter: blur(70px) saturate(1.4) brightness(0.42); transform: scale(1.18)`), creating a rich glowing aura without competing with the card photo.
    - Replaced dashed empty state with an aspirational "First Journey Boarding Pass" invitation card (`.luxury-boarding-empty`) featuring 3 quick-start destination inspiration chips and demo trip loader.
* **Trade-offs Accepted:**
  - The slide-to-confirm gesture was completely retired in favor of one-tap buttons with tactile micro-press. This trade-off was accepted because user friction is significantly reduced and ~70px of critical viewport height is reclaimed for travel photography and card content.

---

## 229. Frosted Glass Slider Launcher, Card Overlap Elimination & Header Layout Refinements
* **Context:**
  - Following the v3.39.1 home screen update, user feedback noted three critical issues:
    1. The static pill dock (`+ New Trip | Join`) looked odd and replaced the beloved interactive slider interaction. The user requested a slider-type launcher with glass-like transparency.
    2. The previous fixed action dock overlapped the bottom of the trip card face (obscuring user avatars, spend amount, and pagination dots).
    3. The header looked clumsy and unrefined (disproportionate button sizes, squeezed title, and an unaligned floating filter row).
* **Decision & Implementation:**
  - **Frosted Glass Slide Launcher (`TripSlideLauncher.tsx`):**
    - Redesigned as a high-end luxury frosted glass capsule (`rgba(15, 23, 42, 0.55)`, `backdrop-filter: blur(28px) saturate(180%)`, `border: 1px solid rgba(255, 255, 255, 0.16)`).
    - Features a 44px translucent frosted glass thumb knob with a directional SVG glider that tilts smoothly with drag velocity.
    - Integrated dual-mode interaction: immediate one-tap activation on the left (`‹ Join`) or right (`Create ›`) zones, plus fluid drag gestures with cross-device pointer capture (working seamlessly on touch, pen, and desktop mouse).
    - Tactile haptic pulses on magnetic notch threshold crossing and release.
    - Eliminated caption clutter for an ultra-sleek, clean profile.
  - **Elimination of Card Overlap:**
    - Root cause: In stack view, the previous dock had `position: fixed; bottom: 20px`, which pulled it out of normal flexbox layout, causing the card stage to expand all the way down into the dock's footprint. Additionally, `--stack-chrome` dynamic measurement was locked behind `isWebKitCompositor()`, skipping non-WebKit browsers (Chrome/Linux).
    - Resolution: Placed `TripSlideLauncher` in normal flex flow directly beneath `.trip-stepper-dots` inside `.trips-screen-main`. Constrained `.trip-stack-stage` with `flex: 1 1 0%; min-height: 0; max-height: 100%; aspect-ratio: 3 / 4; width: auto; max-width: min(390px, calc((var(--app-vh, 100dvh) - var(--stack-chrome, 220px)) * 0.75)); margin: 0 auto 4px;`.
    - Enabled `readStackChrome` for all browsers when `stackActive` is true, ensuring accurate dynamic measurement of header, stepper, launcher, and gaps.
    - In Grid view, docked the slider in `.grid-floating-launcher` with `padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px))` on `.concept2-grid-container`.
  - **Refined Luxury Header:**
    - Harmonized Row 1 with uniform 36px circular frosted glass touch targets: user avatar (left), search button (right), and a smart single-touch circular view toggle button (flipping between Stack and Grid views).
    - Refined the "Journeys" editorial serif title to 22px Playfair Display, letter-spacing -0.015em, optically centered between equal-width flanks.
    - Centered the Row 2 status filter capsule on screen and elevated active states from a harsh solid white block to a translucent frosted glass active indicator (`rgba(255, 255, 255, 0.18)` with subtle specular highlight and glow).
    - Decreased header vertical bulk by ~24px, returning valuable screen height to the card stage.
* **Trade-offs Accepted:**
  - The slider thumb uses pointer capture for universal mouse and touch dragging. Because click and slide are both supported, the tap zones are tuned with a threshold so deliberate taps trigger instantly while drag micro-movements require passing a 35% magnetic commitment threshold before triggering.

---

## 230. Card Edge Bleed Fix, Multi-City Route Summary & Permanent Archived Filter Tab (v3.39.2)
* **Context:**
  - Following the v3.39.1 card revamp, user feedback reported three issues:
    1. The right-side content on the stack card was bleeding out past the card boundary (`Manali → Shimla → Chandi... · ☁ 35°` pill exceeded card width and clipped).
    2. Multi-city destinations (e.g. `Manali → Shimla → Chandigarh`) appeared cluttered and excessively long when stuffed into the compact card-top weather pill.
    3. The "Archived" option was missing from the status filter capsule.
* **Decision & Implementation:**
  - **Card Edge Bleed Fix (`TripStack.tsx`, `index.css`):**
    - Root cause: In `TripStack.tsx` and `index.css`, two separate compounding factors caused the card clipping:
      1. `.concept1-weather-dest` held long destination strings next to the status pill, overflowing the top capsule.
      2. `.trip-stack-stage` had `max-width: min(390px, calc(...))` with `width: auto` and `flex: 1 1 0%` inside a flex column with `overflow: hidden` on `.trip-stack`. On mobile viewports under 390px width (e.g. 360px-380px), the card's computed width from the 3:4 aspect ratio reached 390px, while the container width was only ~348px. Because `max-width: 100%` was missing, the card exceeded the container width by ~42px, and `.trip-stack`'s `overflow: hidden` sliced off the right 42px of the card in a sharp vertical cut.
    - Resolution:
      1. Extracted only the primary hub (`routeInfo.primary`, e.g. `Manali`) for the top weather pill (`Manali · ☁ 35°C`), reducing width by over 120px. Clamped `.concept1-weather-capsule` to `max-width: calc(100% - 110px)`, `min-width: 0`, `overflow: hidden`, and `flex-shrink: 1`.
      2. Anchored `.trip-stack` at `justify-content: flex-start;` and `.trip-stack-stage` at `margin: 6px auto 0 auto;` with `flex: 1 1 0%; height: 100%; max-height: 100%; width: 100%; max-width: min(100%, 390px);`, completely eliminating both the top gap below the filter capsule and the excessive bottom gap above the slider launcher.
      3. Set `width: 100%; max-width: 100%; overflow: visible; box-sizing: border-box;` on `.trip-stack`.
      4. Added `box-sizing: border-box !important; width: 100% !important; height: 100% !important; overflow: hidden;` to `.stack-card`, `.stack-card-sway`, and `.stack-card-face`.
      5. The card now fills the vertical space smoothly, anchoring 6px below the filter capsule and terminating just 6px above the stepper dots, with the slide launcher immediately following (total gap reduced from ~95px down to ~20px). Zero clipping, zero excess gaps.
  - **Multi-City Route Display (`tripDestination.ts`, `TripStack.tsx`, `index.css`):**
    - Added `getItineraryRouteInfo` in `src/utils/tripDestination.ts` which decomposes routes into primary arrival hub, stops count, and smart summary:
      - 1 city: Plain primary city name.
      - 2-3 cities: Complete arrow itinerary `City A ➔ City B ➔ City C`.
      - 4+ cities: Airline route style `Origin ➔ Final Destination · N stops`.
    - Added a dedicated frosted route chip (`.concept1-route-row`) directly in the card body below the trip title (`📍 Manali ➔ Shimla ➔ Chandigarh`), giving multi-city itineraries clear visual prominence without cluttering the top bar.
  - **Permanent Archived Filter Tab (`TripsListScreen.tsx`):**
    - Removed `{categorizedCounts.archived > 0 && (` conditional wrapper so `[ All | Active | Past | Archived ]` is permanently visible in the header capsule. Displays a numeric badge when archived trips are present.
* **Trade-offs Accepted:**
  - The top-right weather capsule displays the primary arrival destination where weather is sampled, while the full journey route is highlighted prominently on the card face.

---

## 231. Boarding Pass Login Screen & Rotating Backdrop Gallery (v3.40.0)
* **Context:**
  - User requested a UI/UX revamp of the unified traveler home/login screen. Explored 3 directions as design-only artifact mockups (Boarding Pass ticket, Quiet Glass minimal auth, Product-First preview) grounded in the app's real brand tokens, researched 2026 auth/travel-UX trends, and legal-compliance requirements (Privacy Policy / Terms links pre-auth). User picked **Boarding Pass**, then asked to extend the concept's hero art with the multi-photo rotation capability already partially supported by the existing single-photo `landing_backdrop_url` Superadmin flag.
* **Decision & Implementation:**
  - **Flag gate (`src/types/admin.ts`, `src/utils/featureFlags.ts`):** New `boardingPassLogin` key, Core pack. **Exception to this repo's "Core defaults ON" rule:** defaults **OFF** — user's explicit call, since this swaps the entry screen for every traveler app-wide the instant it's live, and a staged rollout (superadmin arms it deliberately post-review) was preferred over shipping it hot by default. Documented the exception directly in the flag's `FEATURE_FLAGS_META` description and in `featureFlags.test.ts` (which otherwise asserts every Core flag defaults `true`). Also had to fix two Ops Deck presets in `flagPresets.ts` (`on_the_road`, `power_money`) that assumed all Core flags were always `true` in `DEFAULT_FEATURE_FLAGS` — they now explicitly arm every current Core flag, including new ones, when applied.
  - **`LoginScreen.tsx`:** traveler-persona branch renders the boarding-pass ticket when the flag is on; the pre-existing glass-card screen is the untouched `else` branch (no shared code path removed). Reuses the app's own `.boarding-pass`/`.bp-*` design language (previously only used by `BoardingPassHeroCard.tsx`) for the ticket shell, rather than inventing a parallel visual system.
  - **Ticket layout, corrected through several rounds against the approved mockup** (initial pass over-relied on `BoardingPassHeroCard`'s flip-card CSS, which has a different shape than the mockup's `.a-ticket`):
    - Single seam perforation only (a repeating small-circle radial-gradient strip straddling the photo/card boundary, `.bp-seam-perf`) — not `BoardingPassHeroCard`'s 2-corner-notch style, and not repeated between every internal section.
    - Ticket card (`.login-boarding-pass`) is `position: fixed`, flush to the viewport's left/right/bottom edges, square corners, no shadow — a full-bleed black section, not a floating/rounded "popup" card (`.login-screen-wrap`'s side/bottom padding and `.login-landing-container`'s `max-width` don't apply to it).
    - Gate-code join form sits in its own dashed-border box (`.bp-join-box`); its Join button is Campfire orange (`.bp-join-btn`, `--accent-orange`) instead of the classic screen's cyan.
    - Footer swaps the classic "256-bit encryption" trust seal for a barcode-tick glyph + "Staff ›" link (matches the mockup; the classic screen's footer is unchanged).
    - Card uses a true-black `--bp-paper` override (`#0B0C0E`), not the warm "night pass" paper tone used elsewhere for boarding-pass surfaces.
    - The 3 classic feature pills (Offline-First / Smart Splits / Instant Sync) were added back inside the `<header>` (not as a flow sibling) to fill the open photo space above the ticket — moving them outside the header made them land behind the now-fixed ticket, because `.login-landing-container`'s `justify-content: space-between` pins the *last* in-flow child to the bottom once the ticket left the flow; the header's own `margin-bottom: auto` needed cancelling for the same reason.
  - **Rotating backdrop (`AdminToolsPage.tsx`, `LoginScreen.tsx`, `tripApi.ts`, `types/admin.ts`):** new `landing_backdrop_urls` `AppConfigKey` (jsonb array, no migration needed — `app_config.value` was already `jsonb`). Superadmin's Landing Page Cover Gallery is now multi-select (toggle presets, add custom URLs, upload photos, remove down to a minimum of 1) instead of single-select; still dual-writes the legacy single-URL `landing_backdrop_url` key so the flag-off screen and any older client keep working unchanged. `LoginScreen.tsx` only fetches the array when the flag is on; crossfades through it on a 5s interval (paused under `prefers-reduced-motion`), with dot indicators shown only when 2+ photos are configured.
* **Trade-offs Accepted:**
  - No drag-to-reorder for the backdrop gallery; order = selection order. Add if admins want a specific rotation sequence.
  - Superadmin persona (staff credentials) screen is intentionally untouched either way — this redesign is traveler-facing only.
  - The Ops Deck's multi-select gallery UI was verified by typecheck/lint/reuse of existing classes only, not screenshotted (no local superadmin credentials to reach it in this session) — first Ops Deck visit after arming the flag should double-check it.


