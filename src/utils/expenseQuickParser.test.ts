import { describe, it, expect } from 'vitest';
import { parseQuickExpense } from './expenseQuickParser';
import type { Category, Expense } from '../types';

describe('expenseQuickParser', () => {
  const mockCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', isCustom: false },
    { id: 'cat-travel', name: 'Travel & Commute', isCustom: false },
    { id: 'cat-stay', name: 'Stay & Hotel', isCustom: false },
    { id: 'cat-activities', name: 'Activities & Sightseeing', isCustom: false },
    { id: 'cat-shopping', name: 'Shopping', isCustom: false },
    { id: 'cat-misc', name: 'Miscellaneous', isCustom: false },
  ];

  it('returns null for empty or whitespace-only inputs', () => {
    expect(parseQuickExpense('', mockCategories)).toBeNull();
    expect(parseQuickExpense('   ', mockCategories)).toBeNull();
  });

  it('parses "Dinner 1450 food" with amount, title, and explicit category word', () => {
    const result = parseQuickExpense('Dinner 1450 food', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1450);
    expect(result?.title).toBe('Dinner');
    expect(result?.categoryId).toBe('cat-food');
  });

  it('parses "Uber to airport 420" with travel auto-suggested from title', () => {
    const result = parseQuickExpense('Uber to airport 420', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(420);
    expect(result?.title).toBe('Uber to airport');
    expect(result?.categoryId).toBe('cat-travel');
  });

  it('parses "₹1,200 Airbnb in Goa" with currency symbol and comma formatting', () => {
    const result = parseQuickExpense('₹1,200 Airbnb in Goa', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1200);
    expect(result?.currency).toBe('INR');
    expect(result?.title).toBe('Airbnb in Goa');
    expect(result?.categoryId).toBe('cat-stay');
  });

  it('parses "$45.50 museum tickets" with dollar currency symbol and decimals', () => {
    const result = parseQuickExpense('$45.50 museum tickets', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(45.5);
    expect(result?.currency).toBe('USD');
    expect(result?.title).toBe('Museum tickets');
    expect(result?.categoryId).toBe('cat-activities');
  });

  it('parses "350rs Starbucks coffee" with currency suffix', () => {
    const result = parseQuickExpense('350rs Starbucks coffee', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(350);
    expect(result?.currency).toBe('INR');
    expect(result?.title).toBe('Starbucks coffee');
    expect(result?.categoryId).toBe('cat-food');
  });

  it('leverages historical trip memory when available', () => {
    const historicalExpenses: Expense[] = [
      {
        id: 'e-1',
        tripId: 't-1',
        title: 'Shack 42 Beach Bar',
        amount: 800,
        currency: 'INR',
        category: 'cat-food',
        date: '2026-08-10',
        paidBy: 'm-1',
        splitMode: 'equal',
        splitMemberIds: ['m-1'],
        resolvedShares: { 'm-1': 800 },
        isSettlement: false,
        createdByUserId: 'u-1',
        createdAt: 100,
        updatedAt: 100,
      },
    ];

    const result = parseQuickExpense('Shack 42 1200', mockCategories, historicalExpenses);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1200);
    expect(result?.categoryId).toBe('cat-food');
  });
});
