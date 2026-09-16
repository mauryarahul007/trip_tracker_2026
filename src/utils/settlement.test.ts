import { describe, it, expect } from 'vitest';
import { calculateSettlements, calculateGroupInternalTransfers } from './settlement';
import type { Trip, Member, Expense, Group } from '../types';

describe('Settlement Utilities', () => {
  const membersList: Member[] = [
    { id: 'm1', name: 'Alice' },
    { id: 'm2', name: 'Bob' },
    { id: 'm3', name: 'Charlie' },
  ];

  const members: Record<string, Member> = {
    m1: membersList[0],
    m2: membersList[1],
    m3: membersList[2],
  };

  const trip: Trip = {
    id: 't1',
    name: 'Euro Trip',
    startDate: '2026-08-01',
    endDate: '2026-08-10',
    baseCurrency: 'EUR',
    ownerId: 'u1',
    memberIds: ['m1', 'm2', 'm3'],
    groupIds: [],
    joinCode: 'ABC123',
    createdAt: 0,
    updatedAt: 0,
  };

  it('calculates settlements correctly for a simple equal split', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 't1',
        title: 'Dinner',
        amount: 90,
        currency: 'EUR',
        category: 'Food',
        date: '2026-08-02',
        paidBy: 'm1',
        splitMode: 'equal',
        splitMemberIds: ['m1', 'm2', 'm3'],
        resolvedShares: { m1: 30, m2: 30, m3: 30 },
        createdAt: 0,
        updatedAt: 0,
        isSettlement: false,
        createdByUserId: 'u1',
      },
    ];

    const { balances, transfers } = calculateSettlements(trip, members, expenses);

    // Alice paid 90, owes 30 => balance +60
    // Bob paid 0, owes 30 => balance -30
    // Charlie paid 0, owes 30 => balance -30
    expect(balances.find((b) => b.memberId === 'm1')?.balance).toBe(60);
    expect(balances.find((b) => b.memberId === 'm2')?.balance).toBe(-30);
    expect(balances.find((b) => b.memberId === 'm3')?.balance).toBe(-30);

    // Expected transfers: Bob and Charlie pay Alice 30 each
    expect(transfers).toHaveLength(2);
    const bobTransfer = transfers.find((t) => t.fromMemberId === 'm2');
    const charlieTransfer = transfers.find((t) => t.fromMemberId === 'm3');

    expect(bobTransfer?.toMemberId).toBe('m1');
    expect(bobTransfer?.amount).toBe(30);

    expect(charlieTransfer?.toMemberId).toBe('m1');
    expect(charlieTransfer?.amount).toBe(30);
  });

  it('calculates group internal transfers correctly', () => {
    const balances = [
      { memberId: 'm2', name: 'Bob', balance: -10 },
      { memberId: 'm3', name: 'Charlie', balance: 10 },
    ];
    const group: Group = {
      id: 'g1',
      name: 'Bob & Charlie',
      memberIds: ['m2', 'm3'],
    };

    const transfers = calculateGroupInternalTransfers(balances, group);

    // Bob owes 10, Charlie gets back 10 => Bob pays Charlie 10
    expect(transfers).toHaveLength(1);
    expect(transfers[0].fromMemberId).toBe('m2');
    expect(transfers[0].toMemberId).toBe('m3');
    expect(transfers[0].amount).toBe(10);
  });

  it('distinguishes simplified greedy settlement from direct bilateral debts', () => {
    // Scenario:
    // Alice (m1) pays 60 for Bob (m2) -> Bob owes Alice 60
    // Bob (m2) pays 60 for Charlie (m3) -> Charlie owes Bob 60
    // Net balances: Alice: +60, Bob: 0, Charlie: -60
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 't1',
        title: 'Alice pays for Bob',
        amount: 60,
        currency: 'EUR',
        category: 'Transport',
        date: '2026-08-03',
        paidBy: 'm1',
        splitMode: 'exact',
        splitMemberIds: ['m2'],
        resolvedShares: { m2: 60 },
        createdAt: 1,
        updatedAt: 1,
        isSettlement: false,
        createdByUserId: 'u1',
      },
      {
        id: 'e2',
        tripId: 't1',
        title: 'Bob pays for Charlie',
        amount: 60,
        currency: 'EUR',
        category: 'Transport',
        date: '2026-08-04',
        paidBy: 'm2',
        splitMode: 'exact',
        splitMemberIds: ['m3'],
        resolvedShares: { m3: 60 },
        createdAt: 2,
        updatedAt: 2,
        isSettlement: false,
        createdByUserId: 'u1',
      },
    ];

    // 1. Simplified Debts (Greedy minimization):
    // Charlie pays Alice directly (collapsing Bob out) -> 1 transfer
    const simplified = calculateSettlements(trip, members, expenses, [], { simplifyDebts: true });
    expect(simplified.isSimplified).toBe(true);
    expect(simplified.transfers).toHaveLength(1);
    expect(simplified.transfers[0].fromMemberId).toBe('m3');
    expect(simplified.transfers[0].toMemberId).toBe('m1');
    expect(simplified.transfers[0].amount).toBe(60);

    // 2. Direct Bilateral Debts (simplifyDebts: false):
    // Charlie pays Bob 60, Bob pays Alice 60 (exact pairwise chains preserved) -> 2 transfers
    const direct = calculateSettlements(trip, members, expenses, [], { simplifyDebts: false });
    expect(direct.isSimplified).toBe(false);
    expect(direct.transfers).toHaveLength(2);

    const charlieToBob = direct.transfers.find((t) => t.fromMemberId === 'm3' && t.toMemberId === 'm2');
    const bobToAlice = direct.transfers.find((t) => t.fromMemberId === 'm2' && t.toMemberId === 'm1');

    expect(charlieToBob).toBeDefined();
    expect(charlieToBob?.amount).toBe(60);
    expect(bobToAlice).toBeDefined();
    expect(bobToAlice?.amount).toBe(60);
  });
});

