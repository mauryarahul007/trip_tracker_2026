import { describe, it, expect } from 'vitest';
import { detectDuplicateExpense } from './duplicateExpenseDetector';
import type { Expense, Category, Member } from '../types';

describe('duplicateExpenseDetector', () => {
  const mockCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', isCustom: false },
    { id: 'cat-travel', name: 'Travel & Commute', isCustom: false },
    { id: 'cat-stay', name: 'Stay & Hotel', isCustom: false },
  ];

  const mockMembers: Member[] = [
    { id: 'm-1', name: 'Rahul' },
    { id: 'm-2', name: 'Priya' },
    { id: 'm-3', name: 'Amit' },
  ];

  const baseExpense: Expense = {
    id: 'exp-1',
    tripId: 'trip-1',
    title: 'Dinner at Beach Shack',
    amount: 1400,
    currency: 'INR',
    category: 'cat-food',
    date: '2026-09-12',
    paidBy: 'm-1', // Rahul
    splitMode: 'equal',
    splitMemberIds: ['m-1', 'm-2', 'm-3'],
    resolvedShares: { 'm-1': 466.67, 'm-2': 466.67, 'm-3': 466.66 },
    isSettlement: false,
    createdByUserId: 'u-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('returns null when candidate amount is 0 or negative', () => {
    const result = detectDuplicateExpense(
      { amount: 0, currency: 'INR', title: 'Dinner', date: '2026-09-12' },
      [baseExpense],
      mockCategories,
      mockMembers
    );
    expect(result).toBeNull();
  });

  it('detects high-confidence duplicate when amount, date, and title match', () => {
    const candidate = {
      amount: 1400,
      currency: 'INR',
      title: 'Dinner at Beach Shack',
      date: '2026-09-12',
      categoryId: 'cat-food',
      paidById: 'm-1',
    };
    const result = detectDuplicateExpense(candidate, [baseExpense], mockCategories, mockMembers);
    expect(result).not.toBeNull();
    expect(result?.isDuplicate).toBe(true);
    expect(result?.confidence).toBe('high');
    expect(result?.matchedExpense.id).toBe('exp-1');
  });

  it('detects shared bill duplicate when Priya logs same amount & category on same date', () => {
    const candidate = {
      amount: 1400,
      currency: 'INR',
      title: 'Dinner Bill',
      date: '2026-09-12',
      categoryId: 'cat-food',
      paidById: 'm-2', // Priya logging
    };
    const result = detectDuplicateExpense(candidate, [baseExpense], mockCategories, mockMembers);
    expect(result).not.toBeNull();
    expect(result?.isDuplicate).toBe(true);
    expect(result?.confidence).toBe('medium');
    expect(result?.reason).toContain('Rahul already logged a Food & Dining expense for 1400 today');
  });

  it('excludes self when editing an existing expense', () => {
    const candidate = {
      id: 'exp-1', // same ID as existing
      amount: 1400,
      currency: 'INR',
      title: 'Dinner at Beach Shack',
      date: '2026-09-12',
    };
    const result = detectDuplicateExpense(candidate, [baseExpense], mockCategories, mockMembers);
    expect(result).toBeNull();
  });

  it('ignores soft-deleted or settlement expenses', () => {
    const deletedExpense: Expense = { ...baseExpense, id: 'exp-del', deletedAt: Date.now() };
    const settlementExpense: Expense = { ...baseExpense, id: 'exp-settle', isSettlement: true };
    const candidate = {
      amount: 1400,
      currency: 'INR',
      title: 'Dinner at Beach Shack',
      date: '2026-09-12',
    };
    const result = detectDuplicateExpense(candidate, [deletedExpense, settlementExpense], mockCategories, mockMembers);
    expect(result).toBeNull();
  });

  it('returns null when amounts or dates are completely different', () => {
    const candidateDiffAmount = {
      amount: 450,
      currency: 'INR',
      title: 'Dinner at Beach Shack',
      date: '2026-09-12',
    };
    expect(detectDuplicateExpense(candidateDiffAmount, [baseExpense], mockCategories, mockMembers)).toBeNull();

    const candidateDiffDate = {
      amount: 1400,
      currency: 'INR',
      title: 'Dinner at Beach Shack',
      date: '2026-09-20',
    };
    expect(detectDuplicateExpense(candidateDiffDate, [baseExpense], mockCategories, mockMembers)).toBeNull();
  });
});
