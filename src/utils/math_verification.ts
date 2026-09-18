// Math verification script for Trip Tracker 2026 calculations
import { calculateSettlements } from './settlement';
import type { Expense, Member, Trip } from '../types';

// Copy of resolveShares (src/store/tripStore.ts) for standalone verification —
// keep the largest-remainder distribution in sync with the real one.
const resolveShares = (
  expenseData: { amount: number; splitMode: string; splitConfig?: Record<string, number>; paidBy: string },
  participants: string[]
): Record<string, number> => {
  const resolvedShares: Record<string, number> = {};
  const { amount, splitMode, splitConfig, paidBy } = expenseData;
  const decimals = 2;
  const scale = Math.pow(10, decimals);

  const applyRounding = (shares: Record<string, number>) => {
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    const diff = Number((amount - sum).toFixed(decimals));
    if (diff !== 0) {
      const roundTarget = participants.includes(paidBy) ? paidBy : participants[0];
      if (roundTarget) {
        shares[roundTarget] = Number((shares[roundTarget] + diff).toFixed(decimals));
      }
    }
    return shares;
  };

  const distributeWithLargestRemainder = (rawShares: Record<string, number>): Record<string, number> => {
    const floorUnits: Record<string, number> = {};
    const remainders: { id: string; frac: number }[] = [];
    let allocatedUnits = 0;

    participants.forEach((id) => {
      const scaled = (rawShares[id] || 0) * scale;
      const floored = Math.floor(scaled);
      floorUnits[id] = floored;
      remainders.push({ id, frac: scaled - floored });
      allocatedUnits += floored;
    });

    let remainingUnits = Math.round(amount * scale) - allocatedUnits;

    remainders.sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      if (a.id === paidBy) return -1;
      if (b.id === paidBy) return 1;
      return 0;
    });

    let i = 0;
    while (remainingUnits > 0 && i < remainders.length) {
      floorUnits[remainders[i].id] += 1;
      remainingUnits -= 1;
      i++;
    }
    i = remainders.length - 1;
    while (remainingUnits < 0 && i >= 0) {
      floorUnits[remainders[i].id] -= 1;
      remainingUnits += 1;
      i--;
    }

    const result: Record<string, number> = {};
    participants.forEach((id) => {
      result[id] = Number((floorUnits[id] / scale).toFixed(decimals));
    });
    return result;
  };

  if (splitMode === 'equal') {
    const rawShares: Record<string, number> = {};
    const raw = amount / participants.length;
    participants.forEach((id) => { rawShares[id] = raw; });
    return distributeWithLargestRemainder(rawShares);
  }

  if (splitMode === 'custom') {
    const config = splitConfig || {};
    const totalWeight = participants.reduce((sum, id) => sum + (config[id] || 1), 0);
    const rawShares: Record<string, number> = {};
    if (totalWeight <= 0) {
      const raw = amount / participants.length;
      participants.forEach((id) => { rawShares[id] = raw; });
    } else {
      participants.forEach((id) => {
        rawShares[id] = ((config[id] || 1) / totalWeight) * amount;
      });
    }
    return distributeWithLargestRemainder(rawShares);
  }

  if (splitMode === 'exact') {
    const config = splitConfig || {};
    participants.forEach((id) => {
      resolvedShares[id] = Number((config[id] || 0).toFixed(decimals));
    });
    return applyRounding(resolvedShares);
  }

  if (splitMode === 'percentage') {
    const config = splitConfig || {};
    const rawShares: Record<string, number> = {};
    participants.forEach((id) => {
      rawShares[id] = ((config[id] || 0) / 100) * amount;
    });
    return distributeWithLargestRemainder(rawShares);
  }

  return resolvedShares;
};

// Test Suite
function runTests() {
  console.log("=== Running Math Verification Tests ===");
  let failed = false;

  const assert = (condition: boolean, msg: string) => {
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      failed = true;
    } else {
      console.log(`✅ PASSED: ${msg}`);
    }
  };

  // --- Test 1: Equal Split Rounding ---
  const exp1 = { amount: 100, splitMode: 'equal', paidBy: 'mem-1' };
  const shares1 = resolveShares(exp1, ['mem-1', 'mem-2', 'mem-3']);
  const sum1 = Object.values(shares1).reduce((a, b) => a + b, 0);
  assert(sum1 === 100, "Equal split sum must be exactly 100.00");
  assert(shares1['mem-1'] === 33.34, "Payer should absorb the +0.01 rounding difference (33.34)");
  assert(shares1['mem-2'] === 33.33, "Other participants get 33.33");
  assert(shares1['mem-3'] === 33.33, "Other participants get 33.33");

  // --- Test 1b: Multi-unit remainder is spread, not dumped on one person ---
  // 100 / 7 = 14.2857... -- old code rounded every share to 14.29 then
  // dumped the resulting -0.03 entirely on the payer (14.26 vs everyone
  // else's 14.29). Largest-remainder apportionment should instead give
  // exactly 4 people 14.29 and 3 people 14.28, still summing to 100.00.
  const exp1b = { amount: 100, splitMode: 'equal', paidBy: 'mem-1' };
  const sevenWay = ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5', 'mem-6', 'mem-7'];
  const shares1b = resolveShares(exp1b, sevenWay);
  const sum1b = Object.values(shares1b).reduce((a, b) => a + b, 0);
  const countAt29 = Object.values(shares1b).filter((v) => v === 14.29).length;
  const countAt28 = Object.values(shares1b).filter((v) => v === 14.28).length;
  assert(Math.abs(sum1b - 100) < 1e-9, "7-way split must still sum to exactly 100.00");
  assert(countAt29 === 4, "4 participants should get 14.29");
  assert(countAt28 === 3, "3 participants should get 14.28 (not one person absorbing all -0.03)");

  // --- Test 2: Custom Split with Weights ---
  const exp2 = { 
    amount: 100, 
    splitMode: 'custom', 
    splitConfig: { 'mem-1': 2, 'mem-2': 1, 'mem-3': 1 }, 
    paidBy: 'mem-2' 
  };
  const shares2 = resolveShares(exp2, ['mem-1', 'mem-2', 'mem-3']);
  assert(shares2['mem-1'] === 50.00, "Weight 2 gets 50%");
  assert(shares2['mem-2'] === 25.00, "Weight 1 gets 25%");
  assert(shares2['mem-3'] === 25.00, "Weight 1 gets 25%");

  // --- Test 3: Greedy Settlement Optimization ---
  // Scenario: A owes B $10, B owes C $10
  // Under the hood:
  // mem-1 (A): balance -10
  // mem-2 (B): balance 0 (paid 10, owed 10)
  // mem-3 (C): balance +10
  // Transfers should be optimized: A pays C $10 directly (1 transfer instead of 2)
  const trip: Trip = { 
    id: 'trip-1', 
    name: 'Test Trip', 
    startDate: '2026-08-08', 
    endDate: '2026-08-10', 
    baseCurrency: 'INR', 
    memberIds: ['mem-1', 'mem-2', 'mem-3'],
    groupIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const members: Record<string, Member> = {
    'mem-1': { id: 'mem-1', name: 'A' },
    'mem-2': { id: 'mem-2', name: 'B' },
    'mem-3': { id: 'mem-3', name: 'C' }
  };
  
  // Expense 1: B paid $20, split equally between A and B ($10 each)
  // A owes B $10
  const expenses: Expense[] = [
    {
      id: 'e1',
      tripId: 'trip-1',
      title: 'Lunch',
      amount: 20,
      currency: 'INR',
      category: 'cat-food',
      date: '2026-08-08',
      paidBy: 'mem-2', // B paid
      splitMode: 'equal',
      splitMemberIds: ['mem-1', 'mem-2'], // split between A and B
      resolvedShares: { 'mem-1': 10, 'mem-2': 10 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    // Expense 2: C paid $20, split equally between B and C ($10 each)
    // B owes C $10
    {
      id: 'e2',
      tripId: 'trip-1',
      title: 'Dinner',
      amount: 20,
      currency: 'INR',
      category: 'cat-food',
      date: '2026-08-08',
      paidBy: 'mem-3', // C paid
      splitMode: 'equal',
      splitMemberIds: ['mem-2', 'mem-3'], // split between B and C
      resolvedShares: { 'mem-2': 10, 'mem-3': 10 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  const result = calculateSettlements(trip, members, expenses, []);
  assert(result.balances.find(b => b.memberId === 'mem-1')?.balance === -10, "A should net owe $10");
  assert(result.balances.find(b => b.memberId === 'mem-2')?.balance === 0, "B should net owe $0");
  assert(result.balances.find(b => b.memberId === 'mem-3')?.balance === 10, "C should net gain $10");
  
  assert(result.transfers.length === 1, "Transfers must be optimized down to 1 transfer");
  assert(result.transfers[0].fromMemberId === 'mem-1', "Transfer from A");
  assert(result.transfers[0].toMemberId === 'mem-3', "Transfer to C");
  assert(result.transfers[0].amount === 10, "Transfer amount is $10");

  // --- Test 4: Member Deletion & Redistribution simulation ---
  // Scenario: A and B split a $30 expense. A paid.
  // When B is deleted, the expense is updated: split gets redistributed to A alone.
  const remainingMembers = ['mem-1']; // B is deleted
  const deletedId = 'mem-2';

  const updatedExpenses = expenses.map(exp => {
    let paidBy = exp.paidBy;
    let splitMemberIds = exp.splitMemberIds;
    
    if (exp.paidBy === deletedId) {
      paidBy = remainingMembers[0];
    }
    if (exp.splitMemberIds.includes(deletedId)) {
      splitMemberIds = exp.splitMemberIds.filter(id => id !== deletedId);
      if (splitMemberIds.length === 0) {
        splitMemberIds = [...remainingMembers];
      }
    }
    const resolved = resolveShares({ amount: exp.amount, splitMode: exp.splitMode, paidBy }, splitMemberIds);
    return { ...exp, paidBy, splitMemberIds, resolvedShares: resolved };
  });

  const updatedE1 = updatedExpenses[0];
  assert(updatedE1.paidBy === 'mem-1', "Lunch payer changes to A");
  assert(updatedE1.splitMemberIds.length === 1 && updatedE1.splitMemberIds[0] === 'mem-1', "Lunch split participant list is now only A");
  assert(updatedE1.resolvedShares['mem-1'] === 20, "A's share is now the full $20");

  const updatedE2 = updatedExpenses[1];
  assert(updatedE2.paidBy === 'mem-3', "Dinner payer remains C");
  // Dinner was split between B and C. B is deleted. Split is now just C.
  assert(updatedE2.splitMemberIds.length === 1 && updatedE2.splitMemberIds[0] === 'mem-3', "Dinner split participant list is now only C");
  assert(updatedE2.resolvedShares['mem-3'] === 20, "C's share is now the full $20");

  if (failed) {
    throw new Error("Some math validation tests failed!");
  } else {
    console.log("🎉 All math validation tests passed successfully!");
  }
}

runTests();
