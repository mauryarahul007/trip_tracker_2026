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


