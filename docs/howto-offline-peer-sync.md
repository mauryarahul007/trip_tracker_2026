# How-To: Offline Peer Sync & Data Integrity Guide

This guide explains how **Offline Peer Sync** works from both a user experience perspective and an underlying technical architecture perspective, including how data integrity is maintained using ACID principles.

---

## 1. How It Works (End-to-End User Experience)

```
   ┌────────────────────────────────────────────────────────┐
   │ 1. Enable in Settings                                 │
   │    Toggle ON "Enable Offline Peer Sync" in Settings    │
   └──────────────────────────┬─────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │ 2. Status Bar Sync Indicator Displays Health          │
   │    Header shows small round sync button:               │
   │    • 🟢 "Synced 5m ago" (Up to date)                   │
   │    • 🟠 "Out of sync" (Local changes exist)            │
   └──────────────────────────┬─────────────────────────────┘
                              │
                              ▼ (Click Round Sync Button)
   ┌────────────────────────────────────────────────────────┐
   │ 3. P2P Handshake (Host & Joiner)                       │
   │    • Peer A selects "Host" → displays Offer QR code    │
   │    • Peer B selects "Join" → scans Peer A's QR code    │
   │    • Peer B displays Answer QR code → Peer A scans it  │
   └──────────────────────────┬─────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │ 4. Instant Data Channel Synchronization                │
   │    • Air-gapped WebRTC DataChannel connects locally    │
   │    • Bidirectional payload exchange in <500ms          │
   │    • ACID merge transaction committed atomically       │
   │    • Header updates immediately to 🟢 "Synced just now"│
   └────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step User Workflow

### Step 1: Turning on the Feature Setting
1. Open the **Settings** tab (or **Global Settings**).
2. Scroll to the **Offline Peer Sync** section.
3. Switch the **Enable Offline Peer Sync** toggle to **ON**.
4. The preference is instantly saved to local storage (`trip-tracker-p2p-sync-enabled`).

### Step 2: Monitoring the Status Bar Indicator
Once enabled, the top status bar in the active trip dashboard displays a small, circular sync button:
- **Synced (`🟢`):** The local state matches the last peer exchange. The label displays the relative timestamp (e.g. `Synced 2m ago`).
- **Out of Sync (`🟠`):** The app detects that local expenses, members, or categories have been modified since the last peer sync (or there are pending items in the offline queue). The amber badge and `Out of sync` label indicate a sync is recommended.
- **Syncing (`🔄`):** While transferring data, the sync symbol rotates smoothly.

### Step 3: Performing a Peer-to-Peer Sync
When two travelers want to merge their expenses mid-trip:
1. **Device A (Host):**
   - Taps the round sync button in the header (or "Sync with Offline Peer" in Settings).
   - Taps **"Host Sync (Show QR Code)"**.
   - A high-density QR code appears on the screen (containing compressed WebRTC Session Description Protocol / SDP data).
2. **Device B (Joiner):**
   - Taps the round sync button in the header.
   - Taps **"Join Sync (Scan QR Code)"**.
   - Scans Device A's QR code using the built-in camera scanner.
   - Device B automatically generates and displays its **Answer QR Code**.
3. **Completing the Handshake:**
   - Device A points its camera at Device B's Answer QR code.
   - The direct WebRTC connection opens instantly over local Wi-Fi/Hotspot/Bluetooth radios without internet access.

### Step 4: Automatic ACID Merge & Confirmation
- Both devices exchange trip states and execute the ACID merge engine.
- A **"Sync Complete!"** summary screen appears showing the number of merged expenses and resolved actions.
- The status bar badge immediately flips to `🟢 Synced just now`.

---

## 3. Technical Implementation & Data Integrity (ACID)

```
  Local State A                                        Local State B
  ┌───────────────────────┐                            ┌───────────────────────┐
  │ • Expenses: [E1, E2]  │                            │ • Expenses: [E2, E3]  │
  │ • SyncQueue: [Q1]     │                            │ • SyncQueue: [Q2]     │
  └──────────┬────────────┘                            └───────────┬───────────┘
             │                                                     │
             └───────────────────► ◄───────────────────────────────┘
                                WebRTC DataChannel
                                        │
                                        ▼
                     ┌─────────────────────────────────────┐
                     │          ACID MERGE ENGINE          │
                     │                                     │
                     │ 1. Atomic Snapshot & Validation     │
                     │ 2. Tombstone Priority (SyncQueue)   │
                     │ 3. Last-Write-Wins (LWW) per record │
                     │ 4. Mathematical Invariant Check     │
                     │    (sum(shares) == amount)          │
                     │ 5. Atomic Commit to Disk & Store    │
                     └──────────────────┬──────────────────┘
                                        │
                                        ▼
                     ┌─────────────────────────────────────┐
                     │          CONVERGED STATE            │
                     │ • Expenses: [E1, E2_latest, E3]     │
                     │ • Preserved Deleted Tombstones      │
                     │ • Validated Member Balances         │
                     │ • Updated lastPeerSyncedAt = now()  │
                     └─────────────────────────────────────┘
```

### 1. Atomicity (All-or-Nothing)
- **Snapshot Isolation:** Before touching local state, the engine validates the peer JSON payload.
- **Single Commit:** All 5 collections (`expenses`, `categories`, `members`, `groups`, `syncQueue`) are applied simultaneously in a single Zustand state mutation.
- **Rollback on Error:** If data parsing fails or the connection drops during transmission, the entire transaction is discarded with zero dirty writes.

### 2. Consistency (Invariants Preserved)
- **Financial Balances:** Ensures $\sum \text{resolvedShares} = \text{amount}$. Any fractional rounding difference is attributed to the payer.
- **Referential Integrity:** Split participants must exist in `members`. Missing category assignments fall back to default categories (`cat-misc`).
- **Tombstone Dominance:** Deletions queued in `syncQueue` supersede any existing expense record, preventing deleted records from re-appearing.

### 3. Isolation (Concurrency Control)
- **Non-blocking UI:** User actions during signaling are held in the local optimistic action queue.
- **Deterministic Resolution:** Conflicts on concurrent edits of the same expense are resolved by comparing monotonic `updatedAt` timestamps (highest timestamp wins).

### 4. Durability (Persistence Guarantee)
- Merged state and deduplicated `syncQueue` are written immediately to `localStorage` and IndexedDB before displaying the success state to the user.

---

## 4. Summary of Configuration & Keys

| Config / Storage Key | Type | Description |
| :--- | :--- | :--- |
| `trip-tracker-p2p-sync-enabled` | `boolean` | Setting to enable/disable P2P sync and status bar indicator |
| `trip-tracker-last-peer-sync` | `number` (timestamp) | Timestamp in ms of the last successful peer sync |
| `trip-tracker-sync-queue` | `SyncQueueItem[]` | Offline pending mutations and deletion tombstones |
| `lastModifiedAt` | `number` (timestamp) | Monotonically updated timestamp whenever local trip data changes |
