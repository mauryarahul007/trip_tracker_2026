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

