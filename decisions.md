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
* **Trade-offs Accepted:**
  - Fast repetitive manual inputs of identically priced items on the exact same date within the same form mount session are not flagged against each other until the second item is opened in a new form sheet. This ensures zero false positives during standard creation.










