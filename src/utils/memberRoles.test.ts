import { describe, it, expect } from 'vitest';
import { getMemberRole, isViewerRole, canAddExpense, canEditExpense, canManageTrip } from './memberRoles';
import type { Trip, Expense } from '../types';

describe('memberRoles utility', () => {
  const mockTrip: Trip = {
    id: 'trip-1',
    name: 'Goa Holiday',
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    baseCurrency: 'INR',
    memberIds: ['m1', 'm2', 'm3'],
    groupIds: [],
    ownerId: 'user-1',
    adminMemberIds: ['m1'],
    memberRoles: {
      m1: 'organizer',
      m2: 'contributor',
      m3: 'viewer',
    },
    joinCode: 'GOA123',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('resolves explicit member roles correctly', () => {
    expect(getMemberRole(mockTrip, 'm1')).toBe('organizer');
    expect(getMemberRole(mockTrip, 'm2')).toBe('contributor');
    expect(getMemberRole(mockTrip, 'm3')).toBe('viewer');
    expect(getMemberRole(mockTrip, 'm4')).toBe('contributor'); // fallback
  });

  it('identifies viewer role correctly', () => {
    expect(isViewerRole(mockTrip, 'm3')).toBe(true);
    expect(isViewerRole(mockTrip, 'm2')).toBe(false);
    expect(isViewerRole(mockTrip, 'm3', true)).toBe(false); // admin override
  });

  it('checks canAddExpense permission', () => {
    expect(canAddExpense(mockTrip, 'm1')).toBe(true);
    expect(canAddExpense(mockTrip, 'm2')).toBe(true);
    expect(canAddExpense(mockTrip, 'm3')).toBe(false); // viewer cannot add
    expect(canAddExpense({ ...mockTrip, closed: true }, 'm1')).toBe(false); // closed trip
  });

  it('checks canEditExpense permission', () => {
    const expense1: Expense = {
      id: 'e1',
      tripId: 'trip-1',
      title: 'Dinner',
      amount: 1000,
      currency: 'INR',
      category: 'food',
      date: '2026-09-02',
      paidBy: 'm2',
      splitMode: 'equal',
      splitMemberIds: ['m1', 'm2', 'm3'],
      resolvedShares: { m1: 333.33, m2: 333.34, m3: 333.33 },
      isSettlement: false,
      createdByUserId: 'user-2',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Organizer can edit any expense
    expect(canEditExpense(expense1, mockTrip, 'm1', 'user-1')).toBe(true);
    // Payer can edit
    expect(canEditExpense(expense1, mockTrip, 'm2', 'user-2')).toBe(true);
    // Other contributor cannot edit someone else's expense
    expect(canEditExpense(expense1, mockTrip, 'm4', 'user-4')).toBe(false);
    // Viewer cannot edit
    expect(canEditExpense(expense1, mockTrip, 'm3', 'user-3')).toBe(false);
  });

  it('checks canManageTrip permission', () => {
    expect(canManageTrip(mockTrip, 'm1')).toBe(true);
    expect(canManageTrip(mockTrip, 'm2')).toBe(false);
    expect(canManageTrip(mockTrip, 'm3')).toBe(false);
  });
});
