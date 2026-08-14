# Implementation Plan: Offline Peer Sync, Status Bar Indicator & ACID Data Integrity

Enable an optional **Offline Peer Sync** feature with a settings toggle, a top status bar round sync button displaying real-time sync state (`Last synced` / `Out of sync`), and formal **ACID** transaction integrity across peer-to-peer data merges.

## User Review Required

> [!IMPORTANT]
> **ACID Transaction Commit:** When merging peer data via WebRTC, the store will execute an all-or-nothing transaction snapshot. If the transfer or data integrity validation fails, the entire transaction rolls back cleanly without partial writes.
>
> **Default Setting:** We propose having `p2p_sync_enabled` default to `true` so users can immediately access peer sync or toggle it off in Settings at any time.

---

## How This Will Work

### 1. End-to-End User Flow
```
1. Settings Opt-in
   └─► User navigates to Settings / Global Preferences and toggles "Enable Offline Peer Sync" ON.

2. Status Bar Monitoring
   └─► A small round sync button appears in the top header status bar:
       • 🟢 "Synced 5m ago" — Local data is synchronized with the latest peer exchange.
       • 🟠 "Out of sync" — The user has made local modifications or added expenses since last sync.
       • 🔄 "Syncing..." — Active data transfer in progress.

3. Tap to Sync
   └─► Tapping the round button opens the Offline Peer Sync modal immediately.

4. Air-Gapped WebRTC Handshake (No internet required)
   ├─► Peer A selects "Host" → displays Offer QR code.
   ├─► Peer B selects "Join" → scans Peer A's QR code → displays Answer QR code.
   └─► Peer A scans Peer B's Answer QR code → Direct WebRTC DataChannel connects locally.

5. ACID Merge & Live Feedback
   ├─► Both devices exchange datasets across the local data channel.
   ├─► Merge engine validates financial sums, referential integrity, and resolves conflicts (LWW).
   ├─► Atomic state commit updates IndexedDB, local storage, and the Zustand store.
   └─► Status bar button updates immediately to 🟢 "Synced just now".
```

### 2. Technical Mechanics & State Lifecycle
1. **Sync State Computation:**
   - `lastModifiedAt` updates monotonically on every add/edit/delete expense, member, or group action.
   - `lastPeerSyncedAt` stores the timestamp of the last successful P2P exchange.
   - `isOutOfSync = syncQueue.length > 0 || (lastPeerSyncedAt === null ? expenses.length > 0 : lastModifiedAt > lastPeerSyncedAt)`.
2. **ACID Transaction Commit:**
   - **Atomicity:** Single transactional state update across expenses, custom categories, members, groups, and sync queue. If parsing fails, no partial mutations occur.
   - **Consistency:** Enforces $\sum \text{shares} = \text{amount}$ and referential integrity for participants and categories.
   - **Isolation:** Optimistic UI keeps user inputs responsive without race conditions.
   - **Durability:** Synchronously persisted to `localStorage` (`trip-tracker-sync-queue`) and IndexedDB before showing "Sync Complete".

---

## Proposed Changes

### State Management & Sync Engine

#### [MODIFY] [tripStore.ts](file:///c:/ProjectsV1/Trip_Tracker_2026/src/store/tripStore.ts)
- Add store properties:
  - `p2pSyncEnabled: boolean` (persisted in `localStorage` as `'trip-tracker-p2p-sync-enabled'`)
  - `lastPeerSyncedAt: number | null` (persisted in `localStorage` as `'trip-tracker-last-peer-sync'`)
  - `lastModifiedAt: number`
- Add actions:
  - `setP2PSyncEnabled: (enabled: boolean) => void`
  - `updateLastPeerSyncedAt: (timestamp: number) => void`
- Update `applyP2PMergedState` to update `lastPeerSyncedAt` and commit state atomically.

#### [MODIFY] [p2pSync.ts](file:///c:/ProjectsV1/Trip_Tracker_2026/src/utils/p2pSync.ts)
- Add ACID integrity invariants:
  - Validates sum of `resolvedShares` against expense `amount`.
  - Cleanses orphaned category and member references.
  - Ensures tombstone dominance for queued deletions.

---

### User Interface & Status Bar

#### [MODIFY] [App.tsx](file:///c:/ProjectsV1/Trip_Tracker_2026/src/App.tsx)
- Compute sync status: `isOutOfSync` and `lastSyncedText` (e.g. `"Synced 5m ago"`, `"Out of sync"`).
- In the active trip header (`.app-header`), render a compact, round sync button with a sync icon and status indicator when `p2pSyncEnabled` is `true`.
- Clicking the button launches the `OfflinePeerSync` modal.

#### [MODIFY] [SettingsTab.tsx](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/SettingsTab.tsx) & [GlobalSettingsModal.tsx](file:///c:/ProjectsV1/Trip_Tracker_2026/src/components/GlobalSettingsModal.tsx)
- Add an explicit toggle setting for **Offline Peer Sync** with clear status description and control.

#### [MODIFY] [index.css](file:///c:/ProjectsV1/Trip_Tracker_2026/src/index.css)
- Add styling for `.round-sync-btn`, `.sync-badge-indicator`, and pulse/spin animations.

---

### Documentation Created

- [NEW] [docs/howto-offline-peer-sync.md](file:///c:/ProjectsV1/Trip_Tracker_2026/docs/howto-offline-peer-sync.md): Comprehensive step-by-step user guide and technical mechanics.
- [NEW] [docs/explanation-offline-peer-sync.md](file:///c:/ProjectsV1/Trip_Tracker_2026/docs/explanation-offline-peer-sync.md): Architecture, QR signaling flow, and UX guide.
- [NEW] [docs/reference-data-integrity-acid.md](file:///c:/ProjectsV1/Trip_Tracker_2026/docs/reference-data-integrity-acid.md): Formal ACID properties specification.
- [MODIFY] [decisions.md](file:///c:/ProjectsV1/Trip_Tracker_2026/decisions.md): Architecture Decision Record #10.

---

## Verification Plan

### Automated Tests
- Run Vitest suite:
  ```powershell
  npm test
  ```
- Add unit tests in `src/utils/p2pSync.test.ts` covering:
  - Invariant validation ($\sum \text{shares} = \text{amount}$).
  - Tombstone priority on deletion.
  - Last-Write-Wins conflict resolution on concurrent edits.

### Manual Verification
1. **Toggle Setting:** Enable/disable the setting in Settings; verify the top header status button appears/disappears.
2. **Status Changes:**
   - Add/edit an expense; verify the status updates to `Out of sync` with an amber badge.
   - Perform a peer sync; verify status transitions to `Synced just now` with a green badge.
3. **Interactive Sync:** Tap the round sync button in the header; verify the peer sync modal opens seamlessly.
4. **Data Integrity:** Verify that offline merges preserve all balances, calculations, and expense shares without corruption.
