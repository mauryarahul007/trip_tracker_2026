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





