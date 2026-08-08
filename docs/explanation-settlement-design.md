# Explanation: Settlement Design

The settlement engine minimizes the number of cash transfers needed to settle all debts from a trip. This page explains why debt minimization matters, why a greedy algorithm is the right choice, and what trade-offs were made.

---

## The problem

After a trip with N people and M expenses, each person has a net balance (how much they're owed, or owe). A naive settlement would have every debtor pay every creditor directly, producing up to N×N transfers.

For a 5-person trip, that could be 25 transfers. Most people can't mentally track or execute that many UPI payments.

The goal is: **settle all debts with the fewest possible bank transfers.**

---

## The approach

```
           Greedy Minimization
           ┌─────────────────────────────┐
expenses   │  compute net balances       │   transfers
────────►  │  separate debtors/creditors │  ──────────►
           │  greedy match: largest to   │   (minimized
           │  largest until settled      │    count)
           └─────────────────────────────┘
```

**Step 1 — Net balances.** Sum all expense amounts for each member:
```
balance = sum(amounts paid) − sum(resolved shares owed)
```

Positive balance = "gets back money". Negative balance = "owes money".

**Step 2 — Greedy matching.** Sort debtors by how much they owe (largest first) and creditors by how much they're owed (largest first). Match the top debtor to the top creditor for `min(|debt|, credit)`. Repeat until all balances are zero.

**Why greedy works for trips:** Real trips have 3–10 people. For small N, greedy produces the optimal or near-optimal transfer count. The globally optimal solution (which is NP-hard in general) isn't worth the complexity for this use case.

---

## Why store resolvedShares at write time

A key design choice: `resolvedShares` (the per-person split amounts) are computed and stored when the expense is saved, not when the settlement is calculated.

**Alternative:** derive shares from `splitMode + splitConfig` on every render.

**Why we didn't do that:**
- Member names can change. Archiving a member shouldn't corrupt past splits.
- The split config (`splitConfig`) is optional on equal splits — there's nothing to re-derive from.
- Recalculating at render time means a change to the expense form's rounding logic would silently alter historical balances.

**Trade-off:** `resolvedShares` takes more storage (a record per expense per participant vs. just the config), but it makes the balance calculation a pure, stable function of immutable data.

---

## Settled flag detection

The app doesn't use a separate "settled" table. Instead, settlement transfers are recorded as regular expenses with `title.startsWith("Settlement:")`. The UI detects settled rows by scanning for a matching Settlement expense:

```
isSettled = expenses.some(e =>
  e.title.startsWith("Settlement:") &&
  e.paidBy === transfer.fromMemberId &&
  e.splitMemberIds.includes(transfer.toMemberId) &&
  |e.amount − transfer.amount| < 0.02
)
```

**Why this design:**
- Settlements affect balances — if Priya transfers ₹2000 to Rahul and it's recorded as an expense, Priya's balance goes up by ₹2000 and Rahul's goes down by ₹2000. The math is self-consistent.
- No separate "settled" flag field on Transfer objects means no migration risk if the settlement algorithm changes.

**Trade-off:** a settlement expense that gets deleted re-opens the settled transfer row. This is intentional — deleting a settlement means the transfer didn't happen.

---

## Rounding: where the paise goes

When splitting ₹100 three ways, the result is ₹33.333... The app rounds each share to 2 decimal places (₹33.33) and absorbs the remainder (₹0.01) into the **payer's share**, not an arbitrary first participant.

**Why the payer?** The payer advanced the full amount. Making them absorb the rounding difference means:
- The sum of `resolvedShares` always equals `expense.amount` exactly
- The payer's net "advance" is correct — they paid ₹100 and are owed exactly ₹100 back in total

This is handled by the `applyRounding()` inner function in `resolveShares()` (`src/store/tripStore.ts`):

```typescript
const roundTarget = participants.includes(paidBy) ? paidBy : participants[0];
shares[roundTarget] += diff;
```

If the payer is not a split participant (e.g. they paid on behalf of others but don't share the expense), the first participant absorbs the remainder.

---

## Group settlement: why merge instead of exclude

Trip groups (e.g. a couple, a family) already exist for split convenience — quick-selecting all of a group's members when dividing an expense. Reusing that same `Group` entity for settlement was the obvious choice over inventing a second "settlement pairing" concept.

**Why merge balances instead of just hiding intra-group transfers?** Hiding would still let a group's members show up as separate debtor/creditor nodes towards outsiders, which can produce more transfers than necessary (e.g. A owes ₹50, A's groupmate B is owed ₹70 — merged, the group owes nothing to C and gets ₹20; unmerged, that ₹20 net position isn't visible and two separate transfers might get suggested). Merging into one node before the greedy match keeps the minimization property intact.

**Picking who actually pays/receives.** A merged group node isn't a real bank account — an actual person has to send the money. The member with the most extreme individual balance in the group is picked as the default payer/recipient. This is a suggestion, not a constraint; group members are free to settle among themselves differently.

---

## Why the settle amount is a free input, not locked to the suggestion

The suggested `transfer.amount` is the minimum-transfer-count recommendation, not a requirement. Real payments round to convenient numbers, get short-paid, or get rounded up — locking the input to the exact suggested figure would force users to under/over-report or fudge a separate correcting expense. Letting the settle amount be freely typed and recorded as-is keeps the ledger honest: whatever actually changed hands is what gets recorded, and the next render's balance/transfer recalculation (same derivation as any other expense) picks up any remainder automatically.

---

## Alternatives considered

**Running total approach:** Re-derive balances from scratch on every render instead of storing `resolvedShares`. Rejected because it makes historical data fragile to config changes.

**Separate settlements table:** A dedicated `settlements` table with `{from, to, amount, settled: boolean}`. Rejected because it duplicates the expense structure and requires a migration to add a field.

**Optimal NP-hard solver:** For large N, a minimum-cost-flow algorithm finds the true optimum. Rejected because trip sizes make greedy's results effectively optimal and the complexity cost is unjustified.

---

## Related

- [Reference: Settlement Algorithm](reference-settlement.md) — the exact code and data contracts
- [Explanation: Split Modes](explanation-split-modes.md) — how resolvedShares is computed
- [Reference: Data Model](reference-data-model.md) — Expense.resolvedShares field definition
