# Reference: Settlement Algorithm

The settlement engine lives in `src/utils/settlement.ts`. It takes the trip's raw expense list and produces two outputs: each member's net balance, and the minimum number of cash transfers to settle all debts.

---

## Public API

```typescript
function calculateSettlements(
  trip: Trip,
  members: Record<string, Member>,
  expenses: Expense[],
  groups: Group[] = []  // optional: merge each group's members into one settlement entity
): { balances: MemberBalance[]; transfers: Transfer[] }

interface MemberBalance {
  memberId: string;
  name: string;
  balance: number; // positive = gets back, negative = owes
}

interface Transfer {
  from: string;         // settlement node id: `member:<id>` or `group:<groupId>`
  to: string;
  fromLabel: string;    // member name, or group name if merged
  toLabel: string;
  fromMemberId: string; // real member id recorded as payer when settled
  toMemberId: string;   // real member id recorded as recipient when settled
  amount: number;       // always positive
}
```

`balances` is always per-member — group merging only affects the `transfers` list (Phase 2).

---

## Phase 1: Net balance calculation

For each member in the trip, the algorithm computes:

```
balance[member] = sum(amounts paid by member) − sum(resolved shares owed by member)
```

Only expenses belonging to the active trip are included (`expense.tripId === trip.id`). Settlement expenses (titles starting with `"Settlement:"`) are included — they represent real money movements that affect balances.

**Example:**

| Expense | Amount | Paid By | Rahul's share | Priya's share |
|---------|--------|---------|---------------|---------------|
| Hotel | ₹6000 | Rahul | ₹3000 | ₹3000 |
| Dinner | ₹2000 | Priya | ₹1000 | ₹1000 |

```
Rahul balance  = 6000 (paid) − 3000 (hotel share) − 1000 (dinner share) = +2000
Priya balance  = 2000 (paid) − 3000 (hotel share) − 1000 (dinner share) = −2000
```

Rahul gets back ₹2000. Priya owes ₹2000. One transfer: Priya → Rahul ₹2000.

Balances are rounded to 2 decimal places at this stage: `Number((balance).toFixed(2))`.

---

## Phase 2: Merge groups into settlement nodes

Before matching debtors to creditors, each trip `Group`'s members are collapsed into a single **settlement node** (id `group:<groupId>`) whose balance is the sum of its members' individual balances. A member in no group stays its own node (id `member:<id>`).

```
buildSettlementNodes(balances, groups):
  for each group, map every member id -> that group (first group wins if overlapping)
  for each member balance, add it into its node's running total
    (grouped members share one node; ungrouped members get their own)
```

This is why members of the same group never see a suggested transfer between each other — their individual debts cancel inside the node before matching runs. A group with a net-zero combined balance produces no transfer at all, exactly like an individual member who's already settled.

Because the actual money transfer still needs two real people, each node also carries `memberIds`. When a node is on the debtor side, the member with the most negative individual balance is picked as `fromMemberId` (the one who actually pays); when a node is on the creditor side, the member with the most positive individual balance is picked as `toMemberId`. This is only a default suggestion for who the app records as payer/recipient — nothing stops the actual humans from splitting it differently offline.

---

## Phase 3: Greedy transfer minimization

The algorithm separates settlement nodes into two groups:
- **Debtors** — balance < −0.01
- **Creditors** — balance > +0.01

Nodes within ±₹0.01 are treated as settled (avoids floating-point noise).

The greedy loop runs:

```
while debtors and creditors remain:
  sort debtors ascending (most negative first)
  sort creditors descending (most positive first)
  transfer = min(|debtor.balance|, creditor.balance)
  if transfer > 0.005:
    record Transfer(from=debtor.id, to=creditor.id, amount=transfer, ...)
    reduce debtor.balance by transfer
    reduce creditor.balance by transfer
  remove any node whose |balance| < 0.01
```

This greedy approach is optimal when `N ≤ ~10 nodes`. It may not find the global minimum for larger groups (NP-hard in the general case), but in practice it produces the minimal or near-minimal transfer count for trip sizes.

Because balances are always net (not per-expense), this loop is naturally **transitive**: if A owes B and B owes C by matching amounts, B's net balance cancels to zero and never appears as a node at all — A is matched directly to C.

---

## Transfer amount precision

Suggested transfer amounts are rounded to 2 decimal places: `Number(amountToSettle.toFixed(2))`. This matches the precision of `resolvedShares` in expenses, so the total of all suggested transfers equals the sum of all net balances within ₹0.01.

**Custom settlement amounts.** The `Settle` button's amount field accepts any value, not just the suggested `transfer.amount` — someone paying less (partial) or more (overpaying/rounding up) than the suggestion is a normal, supported case. The amount typed is recorded as-is; balances and the next suggested transfer list are recalculated from the updated expense list on the next render, same as any other expense.

---

## Where resolvedShares comes from

`resolvedShares` is computed by `resolveShares()` in `src/store/tripStore.ts` at expense save time, not at settlement render time. The pure function handles all four split modes and applies smart rounding (remainders go to the payer, not an arbitrary participant).

```
resolvedShares[paidBy] absorbs rounding remainder
```

This ensures the sum of all shares equals the expense amount exactly.

---

## Related

- [Explanation: Settlement Design](explanation-settlement-design.md) — why this algorithm, trade-offs
- [Reference: Data Model](reference-data-model.md) — `Expense.resolvedShares` field
- [How to Record an Expense](howto-record-expense.md) — how split modes feed into resolvedShares
