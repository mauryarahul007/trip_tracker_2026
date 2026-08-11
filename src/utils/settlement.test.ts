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
});
