# Explanation: Offline Peer-to-Peer Sync & Data Integrity

Trip Tracker is engineered as an offline-first Progressive Web Application (PWA). When travelers are on flights, remote treks, cruises, or roaming in areas without cellular connectivity, they cannot rely on cloud servers to synchronize shared group expenses.

This document details the architecture, UX workflow, state-machine synchronization, and **ACID data integrity guarantees** powering the **Offline Peer Sync** feature.

---

## 1. Overview & Architecture

Offline Peer Sync enables two nearby devices to synchronize and merge trip records (expenses, custom categories, members, groups, and pending offline action queues) directly over a **local peer-to-peer data channel (WebRTC DataChannel)** with **zero internet connection and zero external servers**.

```
   ┌────────────────────────────────────────────────────────┐
   │                       PEER A (Host)                    │
   │  Local State (IndexedDB/Store) + Pending Sync Queue    │
   └──────────────────────────┬─────────────────────────────┘
                              │
               1. Displays Offer QR Code (SDP)
                              │
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │                      PEER B (Joiner)                   │
   │  Scans Peer A's QR → Generates Answer QR Code (SDP)    │
   └──────────────────────────┬─────────────────────────────┘
                              │
               2. Peer A Scans Joiner Answer QR
                              │
                              ▼
       =================================================
       Direct P2P WebRTC DataChannel (Air-gapped / Local)
       =================================================
                              │
            3. Bidirectional P2PState Exchange
            4. Deterministic ACID Merge Engine (LWW)
            5. Atomic Disk Persistence (IndexedDB + Storage)
                              │
                              ▼
        Both Peers Converge to Identical Shared State
```

---

## 2. Settings Toggle & Status Bar Sync Indicator

### 2.1 Feature Opt-In Setting
Offline Peer Sync is an optional feature. Users can toggle it on or off in **Settings**:
- **Setting Name:** `Enable Offline Peer Sync` (`p2p_sync_enabled`).
- **Persistence:** Stored in `localStorage` under `trip-tracker-p2p-sync-enabled` and reflected in the global application store.

### 2.2 Header Status Bar Round Sync Button
When the setting is **ON**, a compact, round sync button with a sync icon (`IconRefreshCw`) appears in the active trip header status bar:

- **Visual Indicators:**
  - **In Sync (`synced`):** Shows a subtle green badge dot or timestamp text (e.g. `Synced 5m ago` / `Synced`).
  - **Out of Sync (`out_of_sync`):** Triggered when:
    1. Local expenses/members/groups have been created or modified since the last sync (`lastModifiedAt > lastPeerSyncedAt`).
    2. Items exist in the local offline `syncQueue`.
    3. Peer sync has never been performed (`lastPeerSyncedAt === null`).
    - An amber/orange notification dot and label `Out of sync` alerts the user.
  - **Sync In Progress (`syncing`):** The sync icon smoothly animates with a 360° spin.
- **Interactive Action:** Clicking the round button immediately launches the `OfflinePeerSync` modal.

---

## 3. Data Integrity & ACID Guarantees

In a distributed, decentralized offline-first architecture, data integrity cannot rely on a central SQL coordinator. Trip Tracker enforces **ACID** properties at the client merge boundary:

### 3.1 Atomicity (All-or-Nothing)
- **Snapshot & Rollback Buffer:** Before applying an incoming peer payload, the store captures an in-memory snapshot of the current state (`expenses`, `categories`, `members`, `groups`, `syncQueue`).
- **Atomic Application:** All entities are merged in memory and committed in a single, synchronous store update.
- **Fail-Safe Abort:** If the WebRTC connection drops mid-transfer, or if the received payload fails checksum/schema validation, the entire transaction is discarded. No partial or corrupted state is ever saved.

### 3.2 Consistency (Invariant Enforcement)
The merge engine (`mergeP2PStates`) guarantees that after synchronization, the resulting dataset satisfies all mathematical and relational invariants:

1. **Financial Balance Invariant:**
   $$\sum_{m \in \text{splitMemberIds}} \text{resolvedShares}[m] = \text{amount}$$
   Rounding discrepancies are deterministically resolved against the payer or primary participant.
2. **Referential Integrity:**
   - Every expense `paidBy` and `splitMemberIds` reference must resolve to a valid member.
   - If an expense references a category that does not exist on either peer, it automatically falls back to `cat-misc` (`Misc & Others`).
3. **Tombstone Priority (Deletion Preservation):**
   - Deletions queued in either peer's `syncQueue` (`type: 'deleteExpense'`) act as tombstones and take absolute precedence over resurrected records.
4. **Soft-Deleted Members:**
   - Members flagged as `archived: true` remain preserved in historical transactions without corrupting ongoing split calculations.

### 3.3 Isolation (Concurrency Control)
- **Non-blocking Staging:** If the user creates or modifies an expense while the signaling handshake is occurring, local inputs are queued into the optimistic state machine without race conditions.
- **Deterministic Merge (Last-Write-Wins):** Conflicts on identical records (e.g. both peers edit the same expense while offline) are resolved deterministically using monotonic millisecond timestamps (`updatedAt` and `createdAt`).

### 3.4 Durability (Persistence Guarantees)
- **Immediate Disk Write:** Upon computing the merged state, the client writes the updated collections to IndexedDB and the updated `trip-tracker-sync-queue` to `localStorage` **before** rendering the success state or confirming sync completion.
- **Crash Resilience:** If the browser tab is terminated immediately after the sync completion screen is shown, the persisted data remains intact on reload.

---

## 4. Conflict Resolution Strategy Summary

| Entity Type | Resolution Strategy | Description |
| :--- | :--- | :--- |
| **Expenses** | Tombstone-aware Last-Write-Wins (LWW) | Highest `updatedAt` wins; deleted items in either queue are purged. |
| **Categories** | Union by Unique ID | Custom categories created by either peer are preserved. |
| **Members** | ID-keyed Union & Deep Merge | Member records are unified by `id`. Archived flags are merged (`true` wins). |
| **Groups** | ID-keyed Union & Array Set Merge | Group member lists are merged without duplicates. |
| **Sync Queue** | Deduplicated Action Queue | Action items are keyed by operation type and entity ID to prevent duplicate server replays. |

---

## 5. Security & Privacy Considerations

1. **Ephemeral Air-Gapped Signaling:** QR codes transmit SDP strings with ICE candidates restricted to local link-layer connections. No data is routed through third-party signaling servers.
2. **End-to-End Encrypted DataChannel:** WebRTC DTLS/SCTP encryption secures the data channel in transit between devices.
3. **Scoped Payload:** Only data belonging to the currently active trip and global custom categories are exchanged; private authentication tokens and unrelated trips are strictly excluded.
