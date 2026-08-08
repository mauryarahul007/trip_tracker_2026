# Reference: Settlement Algorithm

The settlement engine lives in `src/utils/settlement.ts`. It takes the trip's raw expense list and produces two outputs: each member's net balance, and the minimum number of cash transfers to settle all debts.

---

## Public API

```typescript
function calculateSettlements(
  trip: Trip,
  members: Record<string, Member>,
  expenses: Expense[]
): { balances: MemberBalance[]; transfers: Transfer[] }

interface MemberBalance {
  memberId: string;
  name: string;
  balance: number; // positive = gets back, negative = owes
}

interface Transfer {
  from: string;  // debtor memberId
  to: string;    // creditor memberId
  amount: number; // always positive
}
```

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

## Phase 2: Greedy transfer minimization

The algorithm separates members into two groups:
- **Debtors** — balance < −0.01
- **Creditors** — balance > +0.01

Members within ±₹0.01 are treated as settled (avoids floating-point noise).

The greedy loop runs:

```
while debtors and creditors remain:
  sort debtors ascending (most negative first)
  sort creditors descending (most positive first)
  transfer = min(|debtor.balance|, creditor.balance)
  if transfer > 0.005:
    record Transfer(from=debtor, to=creditor, amount=transfer)
    reduce debtor.balance by transfer
    reduce creditor.balance by transfer
  remove any member whose |balance| < 0.01
```

This greedy approach is optimal when `N ≤ ~10 members`. It may not find the global minimum for larger groups (NP-hard in the general case), but in practice it produces the minimal or near-minimal transfer count for trip sizes.

---

## Transfer amount precision

Transfer amounts are rounded to 2 decimal places: `Number(amountToSettle.toFixed(2))`. This matches the precision of `resolvedShares` in expenses, so the total of all transfers equals the sum of all net balances within ₹0.01.

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
