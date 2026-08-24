import { describe, it, expect } from 'vitest';
import { calculateTripAchievements } from './achievementBadges';
import type { Trip, Expense, Member, Category } from '../types';

describe('achievementBadges', () => {
  const mockTrip: Trip = {
    id: 't-1',
    name: 'Goa Trip',
    startDate: '2026-08-20',
    endDate: '2026-08-25',
    baseCurrency: 'INR',
    memberIds: ['m1', 'm2', 'm3'],
    groupIds: [],
    ownerId: 'u1',
    joinCode: 'GOA26',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockMembers: Member[] = [
    { id: 'm1', name: 'Rahul' },
    { id: 'm2', name: 'Priya' },
    { id: 'm3', name: 'Amit' },
  ];

  const mockCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', icon: '🍕', isCustom: false },
    { id: 'cat-travel', name: 'Travel & Cab', icon: '🚗', isCustom: false },
  ];

  it('unlocks Squad Power badge for 3+ members', () => {
    const badges = calculateTripAchievements(mockTrip, [], mockMembers, mockCategories, false);
    const squadBadge = badges.find((b) => b.id === 'squad_harmony');
    expect(squadBadge?.unlocked).toBe(true);
  });

  it('unlocks Lightning Settlement badge when trip is fully settled', () => {
    const expenses: Expense[] = [
      {
        id: 'e-1',
        tripId: 't-1',
        title: 'Dinner',
        amount: 2000,
        currency: 'INR',
        category: 'cat-food',
        date: '2026-08-20',
        paidBy: 'm1',
        splitMode: 'equal',
        splitMemberIds: ['m1', 'm2'],
        resolvedShares: { m1: 1000, m2: 1000 },
        isSettlement: false,
        createdByUserId: 'u1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const badges = calculateTripAchievements(mockTrip, expenses, mockMembers, mockCategories, true);
    const settleBadge = badges.find((b) => b.id === 'lightning_settle');
    expect(settleBadge?.unlocked).toBe(true);
  });
});
