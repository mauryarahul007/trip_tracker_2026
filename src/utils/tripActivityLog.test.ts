import { describe, it, expect } from 'vitest';
import { buildTripActivityLog } from './tripActivityLog';
import type { Expense, AppNotification } from '../types';

describe('buildTripActivityLog', () => {
  const baseExpense: Expense = {
    id: 'e1',
    tripId: 't1',
    title: 'Dinner',
    amount: 100,
    currency: 'USD',
    paidBy: 'm1',
    category: 'food',
    date: '2026-10-28',
    isSettlement: false,
    createdByUserId: 'u1',
    splitMode: 'equal',
    splitMemberIds: ['m1', 'm2'],
    resolvedShares: { m1: 50, m2: 50 },
    createdAt: 1000,
    updatedAt: 1000,
  };

  it('includes regular expense as expense_added', () => {
    const log = buildTripActivityLog({
      tripId: 't1',
      expenses: [baseExpense],
    });
    expect(log).toHaveLength(1);
    expect(log[0].data?.type).toBe('expense_added');
    expect(log[0].data?.expenseTitle).toBe('Dinner');
  });

  it('includes refund as expense_refunded', () => {
    const refundExpense: Expense = {
      ...baseExpense,
      id: 'r1',
      title: 'Refund: Dinner',
      amount: 40,
      refundOfExpenseId: 'e1',
      createdAt: 2000,
      updatedAt: 2000,
    };
    const log = buildTripActivityLog({
      tripId: 't1',
      expenses: [baseExpense, refundExpense],
    });
    expect(log).toHaveLength(2);
    const refundRow = log.find((n) => n.id === 'log-add-r1');
    expect(refundRow).toBeDefined();
    expect(refundRow?.data?.type).toBe('expense_refunded');
    expect(refundRow?.data?.expenseTitle).toBe('Refund: Dinner');
  });

  it('deduplicates when real notification already exists for the item', () => {
    const existingNotif: AppNotification = {
      id: 'notif-1',
      tripId: 't1',
      title: 'Expense Added',
      body: 'Dinner added',
      data: { type: 'expense_added', expenseTitle: 'Dinner' },
      read: false,
      createdAt: new Date(1000).toISOString(),
    };

    const log = buildTripActivityLog({
      tripId: 't1',
      expenses: [baseExpense],
      notifications: [existingNotif],
    });
    // Should only have 1 (the real notification), not duplicate with log-add-e1
    expect(log).toHaveLength(1);
    expect(log[0].id).toBe('notif-1');
  });
});
