# Reference: Data Model

All application state lives in a single Zustand store, persisted to IndexedDB under the key `trip_tracker_state`. This page documents every type, field, constraint, and default value.

---

## TripState (root store shape)

Defined in `src/types/index.ts`.

```typescript
interface TripState {
  trips: Trip[];
  activeTripId: string | null;
  members: Record<string, Member>;   // memberId → Member
  groups: Record<string, Group>;     // groupId → Group
  expenses: Expense[];
  categories: Category[];
}
```

`members` and `groups` are keyed maps (not arrays) to allow O(1) lookup by ID from expense references.

---

## Trip

```typescript
interface Trip {
  id: string;           // "trip-{timestamp}", e.g. "trip-1722500000000"
  name: string;         // user-supplied, no length limit enforced in UI
  startDate: string;    // "YYYY-MM-DD" ISO date
  endDate: string;      // "YYYY-MM-DD" ISO date
  baseCurrency: string; // "INR", "USD", "EUR", etc. (free text, not validated)
  memberIds: string[];  // ordered list of member IDs in this trip
  groupIds: string[];   // ordered list of group IDs in this trip
  createdAt: number;    // Unix ms timestamp
  updatedAt: number;    // Unix ms timestamp, updated on any mutation
}
```

**Constraints:**
- `name`, `startDate`, `endDate` are required at creation time (form validation)
- `baseCurrency` defaults to `"INR"` if not changed
- `memberIds` and `groupIds` grow via `addMember`, `createGroup` actions — never directly mutated from the UI

---

## Member

```typescript
interface Member {
  id: string;        // "member-{timestamp}"
  name: string;      // user-supplied display name
  archived?: boolean; // soft-delete: excluded from new splits, preserved in old expenses
}
```

**Constraints:**
- Members are never hard-deleted. `archived: true` hides them from payer selectors and split checklists.
- Archiving a member does not affect `resolvedShares` on existing expenses — those are stored at write-time and are immutable.

---

## Group

```typescript
interface Group {
  id: string;         // "group-{timestamp}"
  name: string;       // e.g. "Rahul & Priya"
  memberIds: string[]; // member IDs in this group (subset of trip memberIds)
}
```

Groups are purely a UI convenience. They appear as quick-select shortcuts in the expense form's split checklist. They have no effect on how shares are calculated.

---

## Expense

```typescript
interface Expense {
  id: string;          // "exp-{timestamp}"
  tripId: string;      // parent trip ID
  title: string;       // user-supplied, e.g. "Hotel Booking"
  amount: number;      // total bill in baseCurrency (always positive)
  currency: string;    // copied from trip.baseCurrency at write time
  category: string;    // category ID (e.g. "cat-food")
  date: string;        // "YYYY-MM-DD"
  paidBy: string;      // memberId of the person who paid the bill
  splitMode: SplitMode; // "equal" | "custom" | "exact" | "percentage"
  splitMemberIds: string[]; // members participating in this expense
  splitConfig?: Record<string, number>; // memberId → weight/amount/percentage (not set for "equal")
  resolvedShares: Record<string, number>; // memberId → exact share in baseCurrency (computed at save time)
  receiptImage?: string; // optional, compressed base64 JPEG data URL
  createdAt: number;
  updatedAt: number;
}
```

**Key design:** `resolvedShares` is computed and stored at save time, not derived at render time. This means editing or archiving members after the fact does not corrupt historical expense data.

**`receiptImage`:** set from an optional file upload on the expense form. Downscaled to a max 1000px dimension and re-encoded as JPEG (quality 0.7) client-side in `src/utils/image.ts` before being stored — keeps IndexedDB entries small even for full camera-resolution photos. Rendered as a thumbnail on the edit form and full-size (click to open in a new tab) in the expense review modal.

**Settlement expenses:** Settlement transfers are recorded as regular expenses with `title.startsWith("Settlement:")`. They are excluded from charts, analytics, and CSV expense lists, but are included in balance calculations.

---

## SplitMode

```typescript
type SplitMode = 'equal' | 'equalUnit' | 'custom' | 'exact' | 'percentage';
```

| Value | `splitConfig` content | Description |
|-------|----------------------|-------------|
| `'equal'` | `undefined` | `amount / participants.length`, rounding to payer |
| `'custom'` | `{ memberId: weight }` | `(weight / totalWeight) × amount` |
| `'exact'` | `{ memberId: amount }` | user-specified per-member amounts; must sum to total ±₹0.02 |
| `'percentage'` | `{ memberId: percent }` | `(percent / 100) × amount`; must sum to 100% ±0.05% |

`'equalUnit'` is defined in the type but not exposed in the current UI. Reserved for future "per-unit" split mode.

---

## Category

```typescript
interface Category {
  id: string;      // "cat-food", "cat-stay", etc. for built-ins; "cat-custom-{ts}" for user-created
  name: string;    // display label
  icon?: string;   // emoji, e.g. "🍔"
  isCustom: boolean; // false for the 6 built-in categories, true for user-created ones
}
```

**Built-in categories (non-deletable in UI):**

| ID | Name | Icon |
|----|------|------|
| `cat-food` | Food & Dining | 🍔 |
| `cat-stay` | Stay & Hotel | 🏨 |
| `cat-travel` | Travel & Transport | ✈️ |
| `cat-activities` | Activities & Sightseeing | 🎟️ |
| `cat-shopping` | Shopping | 🛍️ |
| `cat-misc` | Misc & Others | 📦 |

---

## Store actions reference

Defined in `src/store/tripStore.ts`. All actions are async and persist state to IndexedDB before returning.

### Trip actions

| Action | Signature | Effect |
|--------|-----------|--------|
| `createTrip` | `(name, startDate, endDate, baseCurrency) → void` | Creates trip, sets as active |
| `selectTrip` | `(id \| null) → void` | Sets active trip (null = home screen) |
| `deleteTrip` | `(id) → void` | Removes trip and all its expenses |

### Member actions

| Action | Signature | Effect |
|--------|-----------|--------|
| `addMember` | `(name) → void` | Creates member, adds to active trip |
| `toggleArchiveMember` | `(id) → void` | Flips `archived` flag |
| `updateMember` | `(id, name) → void` | Updates display name |

### Group actions

| Action | Signature | Effect |
|--------|-----------|--------|
| `createGroup` | `(name, memberIds[]) → void` | Creates group, adds to active trip |
| `updateGroup` | `(id, name, memberIds[]) → void` | Replaces name and member list |
| `deleteGroup` | `(id) → void` | Removes group (members unaffected) |

### Expense actions

| Action | Signature | Effect |
|--------|-----------|--------|
| `addExpense` | `(expenseData) → void` | Computes resolvedShares, saves |
| `updateExpense` | `(id, expenseData) → void` | Recomputes resolvedShares, saves |
| `deleteExpense` | `(id) → void` | Removes expense |

### Category actions

| Action | Signature | Effect |
|--------|-----------|--------|
| `addCategory` | `(name, icon?) → void` | Creates custom category; `icon` defaults to 🏷️ if omitted |
| `deleteCategory` | `(id) → void` | Removes custom category only |

### Backup actions

| Action | Signature | Effect |
|--------|-----------|--------|
| `exportDatabase` | `() → string` | Returns full `TripState` as JSON |
| `importDatabase` | `(jsonString) → boolean` | Validates schema, replaces entire state |

---

## Related

- [Explanation: Split Modes](explanation-split-modes.md) — why four modes, when to use each
- [Reference: Settlement Algorithm](reference-settlement.md) — how `resolvedShares` flows into balances
- [Reference: Storage Layer](reference-storage.md) — how the store persists to IndexedDB
