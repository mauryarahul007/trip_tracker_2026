import { describe, it, expect } from 'vitest';
import { mergeP2PStates, type P2PState } from './p2pSync';
import type { Category, Member, Group } from '../types';

describe('P2P State Merger', () => {
  const categories: Category[] = [
    { id: 'cat-food', name: 'Food', isCustom: false },
    { id: 'cat-travel', name: 'Travel', isCustom: false },
  ];

  const members: Record<string, Member> = {
    m1: { id: 'm1', name: 'Alice' },
    m2: { id: 'm2', name: 'Bob' },
  };

  const groups: Record<string, Group> = {
    g1: { id: 'g1', name: 'Alice & Bob', memberIds: ['m1', 'm2'] },
  };

  it('merges new expenses and resolves conflicts using Last-Write-Wins', () => {
    const stateA: P2PState = {
      expenses: [
        {
          id: 'e1',
          tripId: 't1',
          title: 'Lunch A',
          amount: 50,
          currency: 'USD',
          category: 'cat-food',
          date: '2026-08-12',
          paidBy: 'm1',
          splitMode: 'equal',
          splitMemberIds: ['m1', 'm2'],
          resolvedShares: { m1: 25, m2: 25 },
          createdByUserId: 'u1',
          createdAt: 1000,
          updatedAt: 2000, // Peer A has an older update
          isSettlement: false,
        },
      ],
      categories,
      members,
      groups,
      syncQueue: [],
    };

    const stateB: P2PState = {
      expenses: [
        {
          id: 'e1',
          tripId: 't1',
          title: 'Lunch B (Updated)',
          amount: 60,
          currency: 'USD',
          category: 'cat-food',
          date: '2026-08-12',
          paidBy: 'm1',
          splitMode: 'equal',
          splitMemberIds: ['m1', 'm2'],
          resolvedShares: { m1: 30, m2: 30 },
          createdByUserId: 'u1',
          createdAt: 1000,
          updatedAt: 3000, // Peer B has a newer update
          isSettlement: false,
        },
        {
          id: 'e2',
          tripId: 't1',
          title: 'Taxi',
          amount: 15,
          currency: 'USD',
          category: 'cat-travel',
          date: '2026-08-12',
          paidBy: 'm2',
          splitMode: 'equal',
          splitMemberIds: ['m1', 'm2'],
          resolvedShares: { m1: 7.5, m2: 7.5 },
          createdByUserId: 'u2',
          createdAt: 2500,
          updatedAt: 2500,
          isSettlement: false,
        },
      ],
      categories,
      members,
      groups,
      syncQueue: [],
    };

    const merged = mergeP2PStates(stateA, stateB);

    // 1. Should have both expenses
    expect(merged.expenses).toHaveLength(2);

    // 2. Conflict on e1 should be resolved to Lunch B (newest updatedAt)
    const e1 = merged.expenses.find((e) => e.id === 'e1');
    expect(e1?.title).toBe('Lunch B (Updated)');
    expect(e1?.amount).toBe(60);

    // 3. Unique expense e2 should be present
    const e2 = merged.expenses.find((e) => e.id === 'e2');
    expect(e2?.title).toBe('Taxi');
  });

  it('honors deletions in the sync queue over existing expenses', () => {
    const stateA: P2PState = {
      expenses: [
        {
          id: 'e1',
          tripId: 't1',
          title: 'Deleted lunch',
          amount: 50,
          currency: 'USD',
          category: 'cat-food',
          date: '2026-08-12',
          paidBy: 'm1',
          splitMode: 'equal',
          splitMemberIds: ['m1', 'm2'],
          resolvedShares: { m1: 25, m2: 25 },
          createdByUserId: 'u1',
          createdAt: 1000,
          updatedAt: 2000,
          isSettlement: false,
        },
      ],
      categories,
      members,
      groups,
      syncQueue: [
        { id: 'q1', type: 'deleteExpense', payload: { id: 'e1' } },
      ],
    };

    const stateB: P2PState = {
      expenses: [
        {
          id: 'e1',
          tripId: 't1',
          title: 'Deleted lunch',
          amount: 50,
          currency: 'USD',
          category: 'cat-food',
          date: '2026-08-12',
          paidBy: 'm1',
          splitMode: 'equal',
          splitMemberIds: ['m1', 'm2'],
          resolvedShares: { m1: 25, m2: 25 },
          createdByUserId: 'u1',
          createdAt: 1000,
          updatedAt: 2000,
          isSettlement: false,
        },
      ],
      categories,
      members,
      groups,
      syncQueue: [],
    };

    const merged = mergeP2PStates(stateA, stateB);

    // Expense should be omitted in merged result because a delete was queued
    expect(merged.expenses).toHaveLength(0);
    // Delete action should be preserved in the queue
    expect(merged.syncQueue).toHaveLength(1);
    expect(merged.syncQueue[0].payload.id).toBe('e1');
  });

  it('enforces financial balance invariant sum(shares) === amount', () => {
    const stateA: P2PState = {
      expenses: [
        {
          id: 'e1',
          tripId: 't1',
          title: 'Dinner with float rounding delta',
          amount: 100,
          currency: 'USD',
          category: 'cat-food',
          date: '2026-08-12',
          paidBy: 'm1',
          splitMode: 'equal',
          splitMemberIds: ['m1', 'm2', 'm3'],
          resolvedShares: { m1: 33.33, m2: 33.33, m3: 33.33 }, // Sum = 99.99 (delta of 0.01)
          createdByUserId: 'u1',
          createdAt: 1000,
          updatedAt: 2000,
          isSettlement: false,
        },
      ],
      categories,
      members: { ...members, m3: { id: 'm3', name: 'Charlie' } },
      groups,
      syncQueue: [],
    };

    const stateB: P2PState = {
      expenses: [],
      categories,
      members: { ...members, m3: { id: 'm3', name: 'Charlie' } },
      groups,
      syncQueue: [],
    };

    const merged = mergeP2PStates(stateA, stateB);
    expect(merged.expenses).toHaveLength(1);
    const exp = merged.expenses[0];
    const sum = Object.values(exp.resolvedShares).reduce((a, b) => a + b, 0);
    expect(Number(sum.toFixed(2))).toBe(100);
    // The delta was attributed to paidBy (m1)
    expect(exp.resolvedShares.m1).toBe(33.34);
  });

  it('preserves archived=true status on members during merge', () => {
    const stateA: P2PState = {
      expenses: [],
      categories,
      members: {
        m1: { id: 'm1', name: 'Alice', archived: true },
        m2: { id: 'm2', name: 'Bob', archived: false },
      },
      groups,
      syncQueue: [],
    };

    const stateB: P2PState = {
      expenses: [],
      categories,
      members: {
        m1: { id: 'm1', name: 'Alice', archived: false },
        m2: { id: 'm2', name: 'Bob' },
      },
      groups,
      syncQueue: [],
    };

    const merged = mergeP2PStates(stateA, stateB);
    expect(merged.members.m1.archived).toBe(true);
    expect(merged.members.m2.archived).toBe(false);
  });

  it('deduplicates group memberIds across peers', () => {
    const stateA: P2PState = {
      expenses: [],
      categories,
      members,
      groups: {
        g1: { id: 'g1', name: 'Friends', memberIds: ['m1', 'm2'] },
      },
      syncQueue: [],
    };

    const stateB: P2PState = {
      expenses: [],
      categories,
      members,
      groups: {
        g1: { id: 'g1', name: 'Friends', memberIds: ['m2', 'm3'] },
      },
      syncQueue: [],
    };

    const merged = mergeP2PStates(stateA, stateB);
    expect(merged.groups.g1.memberIds).toEqual(['m1', 'm2', 'm3']);
  });
});

