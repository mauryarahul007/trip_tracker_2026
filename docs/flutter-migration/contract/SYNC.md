# Offline Sync & Idempotency Specification (`contract/SYNC.md`)

This specification defines the exact synchronization semantics, mutation replay protocol, conflict resolution policies, tombstone tracking, and idempotency guarantees reverse-engineered from the web/Capacitor implementation (`src/store/tripStore.ts`, `src/services/tripApi.ts`, `src/utils/tripCollabMerge.ts`) for the Flutter native engine (`flutter_app/`, Phase 5).

---

## 1. Sync Queue Mutation Types & Payloads

The client maintains an outbox queue (`syncQueue` in Zustand / `outbox_mutations` in Drift SQLite). Mutations execute in strict FIFO order upon network reconnection or manual flush trigger.

### Mutation Catalog

| `SyncQueueItemType` | Payload Schema | Target Table / RPC | Server Method | Replay Safety Strategy |
|---|---|---|---|---|
| `addExpense` | `{ tempId: string, expenseData: ExpenseData }` | `public.expenses` | `upsert_expense_v1` / `insert` | Idempotent via client UUID (`tempId`) |
| `updateExpense` | `{ id: string, expenseData: ExpenseData }` | `public.expenses` | `updateExpenseRow` / `upsert` | LWW on `updated_at` |
| `deleteExpense` | `{ id: string, userId: string }` | `public.expenses` | `deleteExpenseRow` (soft-delete) | Idempotent (`UPDATE deleted_at = now()`) |
| `restoreExpense` | `{ id: string }` | `public.expenses` | `restoreExpenseRow` | Idempotent (`UPDATE deleted_at = null`) |
| `permanentlyDeleteExpense` | `{ id: string }` | `public.expenses` | `permanentlyDeleteExpenseRow` | Idempotent (`DELETE FROM expenses WHERE id = :id`) |
| `emptyRecycleBin` | `{ tripId: string }` | `public.expenses` | `purgeDeletedExpensesForTrip` | Idempotent (`DELETE WHERE trip_id = :id AND deleted_at IS NOT NULL`) |
| `createTrip` | `{ tripTempId, memberTempId, name, startDate, endDate, baseCurrency, ownerId, destination, creatorName }` | `public.trips`, `public.members` | `insertTrip`, `insertMember` | Client UUIDs (`tripTempId`, `memberTempId`) |
| `addMember` | `{ tempId: string, name: string, linkedUserId?: string, tripId: string }` | `public.members` | `insertMember` | Client UUID (`tempId`) |
| `updateMember` | `{ id: string, name?: string, join_date?: string, leave_date?: string }` | `public.members` | `updateMemberRow` | Idempotent update on primary key |
| `toggleArchiveMember` | `{ id: string, archived: boolean }` | `public.members` | `updateMemberRow` | Idempotent boolean flag |
| `deleteMember` | `{ id: string, groupsToDissolve: string[], groupsToRename: { id, name, memberIds }[] }` | `public.members`, `public.groups` | `deleteMemberRow`, `deleteGroupRow`, `updateGroupRow` | Cascading group dissolution / member pruning |
| `createGroup` | `{ tempId: string, name: string, memberIds: string[], tripId: string }` | `public.groups`, `public.group_members` | `insertGroup` | Client UUID (`tempId`) |
| `updateGroup` | `{ id: string, name: string, memberIds: string[] }` | `public.groups`, `public.group_members` | `updateGroupRow` | Atomic replacement of `group_members` |
| `deleteGroup` | `{ groupId: string }` | `public.groups` | `deleteGroupRow` | Idempotent (`DELETE FROM groups WHERE id = :id`) |
| `addCategory` | `{ tempId: string, name: string, icon?: string, tripId: string }` | `public.categories` | `insertCategory` | Client UUID (`tempId`) |
| `deleteCategory` | `{ id: string }` | `public.categories` | `deleteCategoryRow` | Idempotent (`DELETE FROM categories WHERE id = :id`) |

---

## 2. Replay Order, Retries & Error Handling

### 2.1 FIFO Execution Pipeline (`processQueue()`)
1. **Network Check:** Execution only starts if `isOnline` is true (`navigator.onLine` in web, `connectivity_plus` in Flutter).
2. **Session Freshness:** Revalidates session token via `supabase.auth.getSession()` and triggers `refreshSession()` if the access token is near expiry. If refresh fails, sets `sessionExpired = true` and halts execution without discarding pending queue mutations.
3. **Queue Snapshot:** Clones active queue elements and clears the in-memory array (`syncQueue: []`). Failed items are appended back atomically.
4. **Item Processing:**
   - Evaluates offline receipt image staging in IndexedDB / local file storage. Uploads receipt image to Supabase Storage path `{tripId}/{expenseId}.{ext}` prior to inserting/updating the database row.
   - Forward-geocodes any `pendingName` GPS locations.
   - Invokes backend mutation.
   - On success: updates local entity state, touches `lastBackendSyncedAt = now()`, and triggers push notifications / chat event cards if applicable.
   - On failure:
     - Distinguishes **transient errors** (e.g., HTTP 500, network drop, timeout) from **non-retryable errors** (e.g., RLS policy rejection, foreign key violation, 401 unauthorized).
     - Non-retryable errors set `needsAttention = true` with `lastError` and increment `attempts`.
     - When `enableSyncQueueInspector` is active, stuck items remain visible in the queue inspector drawer for user retry or discard.

---

## 3. Dirty State Tracking & Rehydration Merge

### 3.1 Definition of "Dirty" (`collectDirtyExpenseIds`)
A record is **dirty** if an uncommitted mutation referencing its ID (`item.payload.id` or `item.payload.tempId`) exists within the sync queue:
```typescript
export function collectDirtyExpenseIds(syncQueue: { type: string; payload: any }[]): Set<string> {
  const ids = new Set<string>();
  for (const item of syncQueue) {
    if (item.type === 'addExpense' && item.payload?.tempId) {
      ids.add(item.payload.tempId);
    } else if (item.payload?.id) {
      ids.add(item.payload.id);
    }
  }
  return ids;
}
```

### 3.2 Merge Invariant: Server Overwrites Clean, Local Preserves Dirty
When remote state is fetched (`fetchMyTripGraph` or active trip refresh):
1. **Expenses:**
   - Any local expense whose ID is in `dirtyIds` is preserved **verbatim** from local state.
   - Any expense absent from `dirtyIds` is overwritten by the server row.
   - Optimistic additions (temp UUIDs not yet on server) remain in local list.
2. **Trips:**
   - Metadata (`name`, `start_date`, `end_date`, `base_currency`, `destination`, `stops`) is updated from remote.
   - If a collaborative field write (`checklist`, `notes`, `passes`, `fx_config`) is currently in flight (`collabWritesInFlight > 0` or `keepLocalCollab = true`), the local arrays are preserved to prevent race-condition overwrite.
3. **Members & Groups:**
   - Full set replacement for clean members/groups. Roster merge respects active membership list.

---

## 4. Conflict Resolution Engine

### 4.1 Detection (`detectExpenseConflicts`)
A conflict occurs when a server refresh returns an expense row whose:
1. `id` matches a dirty local expense.
2. Meaningful properties differ (`amount`, `title`, `category`, `date`, `paid_by`, `split_mode`, `resolved_shares`, `receipt_path`).

```typescript
export function detectExpenseConflicts(
  localExpenses: Expense[],
  serverExpenses: Expense[],
  dirtyIds: Set<string>,
  syncQueue: { type: string; payload: any }[]
): ExpenseConflict[]
```

### 4.2 Resolution Strategies
1. **Server Wins:** Local queue mutation for that expense is discarded (`syncQueue.filter(...)`), local state adopts server row.
2. **Local Wins:** Server changes are overwritten by forcing the local queue mutation to replay with updated timestamp.
3. **Split / Merge:** User manually chooses fields in the Conflict Resolver UI (`ConflictResolverModal`).

---

## 5. Collaborative Field Sync (`public.trip_collab_signals`)

Trips contain shared JSON documents (`checklist`, `notes`, `passes`, `fx_config`).
- **Owner vs Participant Access:** Direct `UPDATE` on `trips` is restricted to owner via RLS.
- **Participant Writes:** Migration `0109_participant_trip_collab.sql` provides `public.set_trip_collab_field(p_trip_id, p_field, p_value)`:
  - Validates `public.is_trip_participant(p_trip_id)`.
  - Allowed fields: `'checklist'`, `'notes'`, `'passes'`, `'fx_config'`.
  - Increments `trip_collab_signals.revision` and updates `trips.updated_at = now()`.
- **Realtime Broadcast:** Clients subscribe to `trips` updates (`0110_trip_row_realtime.sql` with `replica identity full`). When received, `applyLiveCollabRow` updates the local array in-memory without full reload.

---

## 6. Tombstones & Soft-Delete Retention

### 6.1 Expense Soft-Delete (`deleted_at`)
- `expenses` rows are soft-deleted via `UPDATE expenses SET deleted_at = now(), deleted_by_user_id = auth.uid()`.
- **Recycle Bin Query:** Active expenses query `deleted_at IS NULL`. Recycle bin queries `deleted_at IS NOT NULL AND deleted_at > now() - interval '24 hours'`.
- **Automated Purge:** `pg_cron` runs hourly calling `public.purge_expired_recycle_bin()`, hard-deleting rows with `deleted_at < now() - interval '24 hours'`.
- **Sync Tombstone Guarantee:** Rows soft-deleted within the last 24 hours remain present in Postgres with their `deleted_at` timestamp, allowing incremental sync (`public.get_trip_changes`) to return them to disconnected clients as deletion tombstones.

---

## 7. Accidental Behaviors & Parity Resolutions (`ACCIDENTAL: keep|fix`)

| Behavior Observed in Web App | Classification | Status & Resolution for Flutter / Migration |
|---|---|---|
| **Replayed `addExpense` throws primary key constraint violation** on network timeout retry if insert landed on server. | `ACCIDENTAL: fix` | **FIXED:** Migration `0115` provides `public.upsert_expense_v1` using `ON CONFLICT (id) DO UPDATE` to ensure true idempotency. |
| **`confirm_settlement` threw `'already confirmed'` exception** on replayed execution. | `ACCIDENTAL: fix` | **FIXED:** Migration `0115` updates `confirm_settlement` to return the existing confirmed row idempotently. |
| **`approve_expense` threw `'expense is not pending approval'`** on replayed execution. | `ACCIDENTAL: fix` | **FIXED:** Migration `0115` updates `approve_expense` to return the confirmed row if already approved. |
| **`resolve_expense_dispute` threw `'expense is not flagged'`** on replayed execution. | `ACCIDENTAL: fix` | **FIXED:** Migration `0115` returns the unflagged row idempotently. |
| **`claim_trip_member` returned `false`** if the caller had already claimed the member. | `ACCIDENTAL: fix` | **FIXED:** Migration `0115` checks if already claimed by `auth.uid()` and returns `true`. |
| **`categories` had no `updated_at` column** or auto-timestamp trigger. | `ACCIDENTAL: fix` | **FIXED:** Migration `0114` adds `updated_at` and before-update trigger. |
| **Missing automatic `before update` triggers** on `trips`, `members`, `groups`, `expenses`. | `ACCIDENTAL: fix` | **FIXED:** Migration `0114` attaches `set_updated_at_column()` triggers across all 5 core tables. |
| **Lack of atomic incremental read query** (forcing client to scan whole expense list on every trip open). | `ACCIDENTAL: fix` | **FIXED:** Migration `0115` introduces `public.get_trip_changes(p_trip_id, p_since)`. |

---

## 8. Incremental Delta Protocol: `public.get_trip_changes`

### RPC Signature
```sql
public.get_trip_changes(
  p_trip_id uuid,
  p_since timestamptz default '-infinity'::timestamptz
) returns jsonb
```

### JSON Response Schema
```json
{
  "server_time": "2026-10-06T02:45:00.000Z",
  "trip": { ... } | null,
  "members": [ ... ],
  "groups": [ ... ],
  "group_members": [ ... ],
  "categories": [ ... ],
  "expenses": [ ... ],
  "tombstones": {
    "expenses": ["d9f8e4b2-..."]
  }
}
```

### High-Water Mark Cursor Rules:
1. Client initializes with cursor `p_since = '-infinity'::timestamptz` (returns all records).
2. On completion, client stores `server_time` from the response as its new cursor.
3. On reconnect / delta refresh, client passes stored cursor minus 10 seconds (clock-skew buffer).
4. Flutter Drift repository applies upserts for entities and hard-deletes rows matching `tombstones.expenses`.
