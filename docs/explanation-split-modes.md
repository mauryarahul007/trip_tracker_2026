# Explanation: Split Modes

Trip Tracker 2026 supports four ways to divide an expense. This page explains why each mode exists, what problem it solves, and when the wrong mode causes trouble.

---

## The problem

A single "split equally" button fails in real trips because people's actual obligations differ:

- A couple sharing a hotel room owes twice what a solo traveller owes for the same room
- An itemized restaurant bill has exact per-person amounts that don't divide equally
- A group agrees to cover costs 60/40 because of unequal income or contribution
- A family of four counts children as half-shares

One mode cannot represent all of these correctly. Forcing equal splits leads to arguments or manual off-app tracking.

---

## The four modes

### Equal

**When to use:** everyone owes the same amount and the group is homogeneous (no couples, no children).

```
share = amount / participantCount
```

Rounding remainders (from non-divisible amounts) go to the **payer**, not an arbitrary participant. This is the smart rounding design: the person who advanced the money absorbs the paise-level rounding difference.

**Example:** ₹100 split 3 ways = ₹33.33, ₹33.33, ₹33.34 (payer gets the extra paisa).

**Failure mode:** used for a hotel where a couple and a solo traveller share — the couple is effectively charged half what they should be.

---

### Custom Weight

**When to use:** people share proportionally but the exact amounts aren't known upfront. Classic use case: couples count as weight 2, solo travellers as weight 1.

```
share[member] = (weight[member] / totalWeight) × amount
```

Weights can be any positive number. 2 and 1 are conventional but you could use 3, 2, 1 for a family of 3, 2, and 1 people.

**Example:** Hotel ₹6000, Rahul (solo, weight 1), Priya+Amit couple (weight 2):
- Total weight = 3
- Rahul: (1/3) × 6000 = ₹2000
- Priya+Amit: (2/3) × 6000 = ₹4000

**Failure mode:** used when you actually have exact amounts — you lose precision to rounding from the proportional calculation.

---

### Exact Amount

**When to use:** you have an itemized bill or each person's exact share is already known.

```
share[member] = the number you type
```

The form validates that all entered amounts sum to the total (±₹0.02 tolerance for rounding). If they don't match, it blocks submission.

**Example:** Restaurant bill itemized: Rahul ₹850, Priya ₹1200, Amit ₹650. Total: ₹2700. Each person enters their own amount.

**Failure mode:** used when you only have approximations — any mismatch >₹0.02 is rejected.

---

### Percentage

**When to use:** the group has agreed on percentage-based sharing (common in business trip cost-sharing or group contributions by salary band).

```
share[member] = (percentage[member] / 100) × amount
```

Percentages must sum to 100% (±0.05% tolerance).

**Example:** Two colleagues agree to split a ₹10,000 team dinner 60/40 by seniority:
- Senior: 60% × 10,000 = ₹6,000
- Junior: 40% × 10,000 = ₹4,000

**Failure mode:** trying to express exact amounts as percentages — you introduce unnecessary rounding when you already know the amounts.

---

## Choosing the right mode: decision tree

```
Do you know each person's exact share in rupees?
├─ Yes → Exact Amount
└─ No
   Do you have agreed percentages?
   ├─ Yes → Percentage
   └─ No
      Does the group have couples or families (non-equal units)?
      ├─ Yes → Custom Weight (1 per adult, 2 per couple, etc.)
      └─ No → Equal
```

---

## How resolvedShares is stored

Regardless of split mode, the actual per-person amounts are computed at save time and stored in `Expense.resolvedShares`. This is a deliberate design choice: if you change a member's name, add new members, or archive someone after the expense is recorded, the historical split amounts remain correct and unchanged.

The settlement engine only reads `resolvedShares` — it never re-derives shares from `splitConfig` or `splitMode`. This makes the settlement calculations stable across any future data changes.

---

## Trade-offs

| Mode | Accuracy | Input effort | Risk of error |
|------|----------|--------------|---------------|
| Equal | Low (for mixed groups) | None | Undercharges couples |
| Custom Weight | Medium | Low (enter weights) | Weight assignment is subjective |
| Exact Amount | High | Medium (enter amounts) | Fails if you don't have exact numbers |
| Percentage | High | Low (enter %) | Must sum to exactly 100% |

---

## Related

- [How to Record an Expense](howto-record-expense.md) — step-by-step for each mode in the UI
- [Reference: Data Model — SplitMode](reference-data-model.md#splitmode) — type definition
- [Reference: Settlement Algorithm](reference-settlement.md) — how resolvedShares flows into balances
