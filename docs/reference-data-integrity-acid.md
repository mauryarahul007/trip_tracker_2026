# Reference: Data Integrity & ACID Guarantees in Offline Peer Sync

This document serves as the formal specification and reference guide for data integrity and ACID properties implemented across Trip Tracker's storage, synchronization, and settlement engine.

---

## 1. ACID Invariant Formal Definitions

| Property | Local Storage (IndexedDB/State) | Distributed P2P Sync (WebRTC) |
| :--- | :--- | :--- |
| **Atomicity** | Store updates execute synchronously as single atomic state transactions. | Merge batches across 5 entities (expenses, categories, members, groups, sync queues) commit as a unified transaction or fail entirely. |
| **Consistency** | Referential integrity between expenses, members, and categories is enforced prior to state commit. | Pre-commit schema validators sanitize missing references, fix rounding discrepancies, and prune tombstones. |
| **Isolation** | Single-threaded JavaScript event loop with optimistic Zustand immutability. | Ephemeral transfer staging isolates peer packets from user input until reconciliation completes. |
| **Durability** | State writes are committed synchronously to persistent browser storage. | Multi-tier persistence guarantees (`localStorage` + IndexedDB) commit before signaling sync success. |

---

## 2. In-Depth ACID Mechanisms

### 2.1 Atomicity & Transactional Rollback
When a peer sync payload is received:
1. **Validation Phase:** The incoming JSON payload is checked against schema constraints:
   - Must contain arrays: `expenses`, `categories`, `syncQueue`.
   - Must contain records: `members`, `groups`.
   - Payload size and structure must be valid.
2. **Execution Phase:** `mergeP2PStates(localState, peerState)` computes the unified dataset.
3. **Commit Phase:** The store executes an atomic `setState()`:
   ```typescript
   set((state) => ({
     expenses: merged.expenses,
     categories: merged.categories,
     members: merged.members,
     groups: merged.groups,
     trips: updatedTrips,
     syncQueue: merged.syncQueue,
     lastPeerSyncedAt: Date.now(),
   }));
   ```
4. **Failure Handling:** If any step in parsing or merging throws an error, the catch handler logs the error, keeps existing state untouched, and triggers an error notice without dirtying persistent storage.

### 2.2 Consistency & Mathematical Invariants
Every merged expense record must satisfy:
$$\text{amount} = \sum_{k \in \text{splitMemberIds}} \text{resolvedShares}[k]$$
If a floating-point delta $\delta = \text{amount} - \sum \text{resolvedShares}$ occurs due to fractional division, $\delta$ is assigned to `paidBy` (or the first participant), guaranteeing exact cent precision.

#### Foreign Key & Reference Invariants:
- **`paidBy` Member Check:** If `paidBy` is missing from `members`, the transaction flags the record and preserves the original identifier.
- **`splitMemberIds` Validity:** Any split participant ID is validated against `members`.
- **Category Fallback:** Non-existent category IDs default to `cat-misc`.

### 2.3 Isolation & Concurrency Control
- **Optimistic Concurrency:** Users can freely interact with the UI, log expenses, or edit splits while a WebRTC connection is being established.
- **Timestamp Monotonicity:** Every mutating action records an updated `updatedAt = Date.now()`. When combining edits, the highest `updatedAt` wins:
  ```typescript
  if (!existing || exp.updatedAt > existing.updatedAt) {
    expenseMap.set(exp.id, exp);
  }
  ```
- **Tombstone Dominance:** A deletion entry in `syncQueue` overrides any existing expense record regardless of its `updatedAt` timestamp, preventing "zombie" resurrected records.

### 2.4 Durability & Multi-Tier Persistence
- Merged state writes to both:
  1. `localStorage.setItem('trip-tracker-sync-queue', ...)`
  2. `localStorage.setItem('trip-tracker-last-sync-timestamp', ...)`
  3. Supabase / IndexedDB offline cache.
- The UI renders the green "Sync Complete" banner only after all persistence calls complete.

---

## 3. Sync State Indicator Logic

The sync status in the header reflects the following deterministic states:

```typescript
type SyncStatus = 'synced' | 'out_of_sync' | 'syncing' | 'disabled';

function computeSyncStatus(
  enabled: boolean,
  isSyncing: boolean,
  syncQueueLength: number,
  lastModifiedAt: number,
  lastPeerSyncedAt: number | null
): SyncStatus {
  if (!enabled) return 'disabled';
  if (isSyncing) return 'syncing';
  if (syncQueueLength > 0) return 'out_of_sync';
  if (!lastPeerSyncedAt || lastModifiedAt > lastPeerSyncedAt) return 'out_of_sync';
  return 'synced';
}
```
