import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import { getLatestNonSettlementExpense } from './lastExpense';

function exp(partial: Partial<Expense> & Pick<Expense, 'id' | 'createdAt'>): Expense {
  return {
    tripId: 't1',
    title: 'Food',
    amount: 10,
    currency: 'INR',
    category: 'cat-food',
    date: '2026-01-01',
    paidBy: 'm1',
    splitMode: 'equal',
    splitMemberIds: ['m1'],
    resolvedShares: { m1: 10 },
    isSettlement: false,
    createdByUserId: 'u1',
    updatedAt: partial.createdAt,
    ...partial,
  };
}

describe('lastExpense', () => {
  it('returns the newest non-settlement expense', () => {
    const expenses = [
      exp({ id: 'a', createdAt: 1, title: 'Old' }),
      exp({ id: 'b', createdAt: 3, title: 'Latest' }),
      exp({ id: 'c', createdAt: 2, title: 'Settlement: A ➔ B', isSettlement: true }),
    ];
    expect(getLatestNonSettlementExpense(expenses, 't1')?.id).toBe('b');
  });

  it('returns null when only settlements exist', () => {
    const expenses = [exp({ id: 'c', createdAt: 2, title: 'Settlement: A ➔ B', isSettlement: true })];
    expect(getLatestNonSettlementExpense(expenses, 't1')).toBeNull();
  });
});
