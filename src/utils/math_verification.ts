// Math verification script for Trip Tracker 2026 calculations
import { calculateSettlements } from './settlement';
import type { Expense, Member, Trip } from '../types';

// Copy resolveShares for test verification
const resolveShares = (
  expenseData: { amount: number; splitMode: string; splitConfig?: Record<string, number>; paidBy: string },
  participants: string[]
): Record<string, number> => {
  const resolvedShares: Record<string, number> = {};
  const { amount, splitMode, splitConfig, paidBy } = expenseData;

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

  if (splitMode === 'equal') {
    const share = Number((amount / participants.length).toFixed(2));
    participants.forEach((id) => { resolvedShares[id] = share; });
    return applyRounding(resolvedShares);
  }

  if (splitMode === 'custom') {
    const config = splitConfig || {};
    const totalWeight = participants.reduce((sum, id) => sum + (config[id] || 1), 0);
    if (totalWeight <= 0) {
      const share = Number((amount / participants.length).toFixed(2));
      participants.forEach((id) => { resolvedShares[id] = share; });
    } else {
      participants.forEach((id) => {
        resolvedShares[id] = Number((((config[id] || 1) / totalWeight) * amount).toFixed(2));
      });
    }
    return applyRounding(resolvedShares);
  }

  if (splitMode === 'exact') {
    const config = splitConfig || {};
    participants.forEach((id) => {
      resolvedShares[id] = Number((config[id] || 0).toFixed(2));
    });
    return applyRounding(resolvedShares);
  }

  if (splitMode === 'percentage') {
    const config = splitConfig || {};
    participants.forEach((id) => {
      resolvedShares[id] = Number((((config[id] || 0) / 100) * amount).toFixed(2));
    });
    return applyRounding(resolvedShares);
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
