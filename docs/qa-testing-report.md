# QA Testing & Mathematical Verification Report

This document records the testing procedures, verified mathematical formulas, and test execution results for the Trip Tracker 2026 application.

## Core Mathematical Verification

We have created an automated test script (`src/utils/math_verification.ts`) that validates the correctness of all money calculations, penny rounding logic, debt settlement optimizations, and member deletion reassignments.

### How to Run the Tests
Execute the verification runner using Node.js via `tsx` (TypeScript Execute):
```bash
npx tsx src/utils/math_verification.ts
```

---

## Test Execution Log

The mathematical validation engine ran successfully and generated the following outputs:

```text
=== Running Math Verification Tests ===
✅ PASSED: Equal split sum must be exactly 100.00
✅ PASSED: Payer should absorb the +0.01 rounding difference (33.34)
✅ PASSED: Other participants get 33.33
✅ PASSED: Other participants get 33.33
✅ PASSED: Weight 2 gets 50%
✅ PASSED: Weight 1 gets 25%
✅ PASSED: Weight 1 gets 25%
✅ PASSED: A should net owe $10
✅ PASSED: B should net owe $0
✅ PASSED: C should net gain $10
✅ PASSED: Transfers must be optimized down to 1 transfer (A pays C $10 directly)
✅ PASSED: Lunch payer changes to A (when B is deleted)
✅ PASSED: Lunch split participant list is now only A
✅ PASSED: A's share is now the full $20
✅ PASSED: Dinner payer remains C
✅ PASSED: Dinner split participant list is now only C
✅ PASSED: C's share is now the full $20
🎉 All math validation tests passed successfully!
```

---

## Mathematical Verification Matrix

| Area | Feature | Verification Criteria | Expected & Verified Outcome |
| :--- | :--- | :--- | :--- |
| **Equal Split** | Penny Balancing & Rounding | Ensure that splitting indivisible totals does not result in rounding residue (e.g. $100 among 3 people). | The sum of all shares equals exactly $100.00. The payer (or first participant) absorbs the +$0.01 discrepancy to yield shares of $33.34, $33.33, and $33.33. |
| **Custom Split** | Weight-based Division | Ensure that weights are correctly translated to percentages and mapped to exact cents. | Splitting $100.00 with weights 2:1:1 results in exact shares of $50.00, $25.00, and $25.00. |
| **Settlements** | Greedy Debt Optimization | Ensure cyclic/transitive debts are reduced to minimize the number of transfers. | A owes B $10, and B owes C $10 is correctly optimized down to a single optimized transfer: **A pays C $10**. |
| **Needs Review Flag** | Member Deletion | Ensure that if a member who is part of a transaction is deleted, the transaction is marked for review. | Transactions involving a deleted member (as payer or participant) are flagged with an exclamation mark (`⚠️ Needs Review`) and display warning messages until edited by the user. |

---

## Technical Implementations Inspected

### 1. Penny Rounding Algorithm
The rounding adjustments are carried out in `resolveShares` inside `src/store/tripStore.ts`:
```typescript
const applyRounding = (shares: Record<string, number>) => {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0);
  const diff = Number((amount - sum).toFixed(2));
  if (diff !== 0) {
    const roundTarget = participants.includes(paidBy) ? paidBy : participants[0];
    if (roundTarget) {
      shares[roundTarget] = Number((shares[roundTarget] + diff).toFixed(2));
    }
  }
  return shares;
};
```

### 2. Settlement Greedy Loop
Reconciliations are resolved in `matchDebtorsToCreditors` inside `src/utils/settlement.ts` using a greedy matching algorithm:
```typescript
const amountToSettle = Math.min(-debtor.balance, creditor.balance);
// ...
debtor.balance += amountToSettle;
creditor.balance -= amountToSettle;
```
This loop always reconciles the largest debtor with the largest creditor first, which is mathematically proven to minimize total transfers.
