import { describe, it, expect } from 'vitest';
import { getTripArchetype, getMemberSuperlatives, getTripRhythm } from './TripWrappedModal';
import type { Trip, Expense, Member, Category } from '../types';

describe('TripWrappedModal helper functions', () => {
  const mockCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false },
    { id: 'cat-hotel', name: 'Hotels & Stay', icon: '🏨', isCustom: false },
    { id: 'cat-transit', name: 'Travel & Transport', icon: '✈️', isCustom: false },
  ];

  const mockMembers: Member[] = [
    { id: 'm-1', name: 'Rahul' },
    { id: 'm-2', name: 'Priya' },
    { id: 'm-3', name: 'Amit' },
  ];

  const mockTrip: Trip = {
    id: 't-1',
    name: 'Goa Holiday',
    destination: 'Goa',
    startDate: '2026-08-20',
    endDate: '2026-08-25',
    baseCurrency: 'INR',
    memberIds: ['m-1', 'm-2', 'm-3'],
    groupIds: [],
    ownerId: 'u-1',
    joinCode: 'GOA123',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const createExpense = (id: string, title: string, amount: number, paidBy: string, category: string, date: string): Expense => ({
    id,
    tripId: 't-1',
    title,
    amount,
    currency: 'INR',
    category,
    date,
    paidBy,
    splitMode: 'equal',
    splitMemberIds: ['m-1', 'm-2'],
    resolvedShares: { 'm-1': amount / 2, 'm-2': amount / 2 },
    isSettlement: false,
    createdByUserId: 'u-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  it('determines Foodie Pilgrimage archetype when Food is top spend', () => {
    const expenses: Expense[] = [
      createExpense('e-1', 'Beach Dinner', 5000, 'm-1', 'cat-food', '2026-08-21'),
      createExpense('e-2', 'Lunch', 3000, 'm-2', 'cat-food', '2026-08-22'),
      createExpense('e-3', 'Taxi', 1500, 'm-3', 'cat-transit', '2026-08-21'),
    ];

    const archetype = getTripArchetype(mockCategories, expenses);
    expect(archetype.title).toBe('The Gourmet Pilgrimage');
    expect(archetype.icon).toBe('🍕');
    expect(archetype.tag).toBe('FOODIE PARADISE');
  });

  it('assigns member superlatives without including raw financial currency values', () => {
    const expenses: Expense[] = [
      createExpense('e-1', 'Beach Dinner', 5000, 'm-1', 'cat-food', '2026-08-21'),
      createExpense('e-2', 'Breakfast', 1000, 'm-1', 'cat-food', '2026-08-22'),
      createExpense('e-3', 'Flight', 8000, 'm-3', 'cat-transit', '2026-08-20'),
    ];

    const superlatives = getMemberSuperlatives(mockMembers, expenses, mockCategories);
    expect(superlatives.length).toBeGreaterThan(0);

    // Rahul has most count (2 expenses) -> Chief Quartermaster
    expect(superlatives.find((s) => s.memberName === 'Rahul')?.title).toBe('Chief Quartermaster');
    // Amit paid for transit -> Transit Navigator
    expect(superlatives.find((s) => s.memberName === 'Amit')?.title).toBe('Transit Navigator');

    // Verify no rupee or dollar signs in descriptions
    superlatives.forEach((s) => {
      expect(s.note).not.toContain('₹');
      expect(s.note).not.toContain('$');
    });
  });

  it('calculates trip rhythm and peak adventure day cleanly', () => {
    const expenses: Expense[] = [
      createExpense('e-1', 'Beach Party', 2000, 'm-1', 'cat-food', '2026-08-22'), // Saturday
      createExpense('e-2', 'Scuba', 4000, 'm-2', 'cat-transit', '2026-08-22'), // Saturday
    ];

    const rhythm = getTripRhythm(expenses, mockTrip);
    expect(rhythm.peakDay).toBe('Saturday');
    expect(rhythm.vibeTag).toContain('GOA');
  });

  it('handles multiple tied peak adventure days dynamically', () => {
    const expenses: Expense[] = [
      createExpense('e-1', 'Sightseeing', 2000, 'm-1', 'cat-food', '2026-08-19'), // Wednesday
      createExpense('e-2', 'Trek', 4000, 'm-2', 'cat-transit', '2026-08-20'), // Thursday
    ];

    const rhythm = getTripRhythm(expenses, mockTrip);
    expect(rhythm.peakDay).toBe('Wednesday & Thursday');
  });
});
