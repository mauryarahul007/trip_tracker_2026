import { describe, it, expect } from 'vitest';
import { calculateBudgetPacing, getCalendarDayDiff, toLocalDateString } from './budgetPacing';
import type { Expense, Trip } from '../types';

function makeExpense(partial: Partial<Expense>): Expense {
  return {
    id: 'e-' + Math.random().toString(36).slice(2, 7),
    tripId: 'trip1',
    paidBy: 'm1',
    amount: 1000,
    currency: '₹',
    category: 'food',
    title: 'Test Expense',
    date: '2026-11-10',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    splitMode: 'equal',
    splitMemberIds: ['m1'],
    resolvedShares: {},
    isSettlement: false,
    createdByUserId: null,
    ...partial,
  };
}

describe('budgetPacing', () => {
  it('correctly calculates calendar day difference', () => {
    expect(getCalendarDayDiff('2026-11-10', '2026-11-15')).toBe(6);
    expect(getCalendarDayDiff('2026-11-10', '2026-11-10')).toBe(1);
    expect(getCalendarDayDiff('2026-11-28', '2026-12-02')).toBe(5);
  });

  it('normalizes local date strings consistently', () => {
    const d = new Date(2026, 10, 15); // Month is 0-indexed, so 10 is November
    expect(toLocalDateString(d)).toBe('2026-11-15');
  });

  it('handles trip with no budget set', () => {
    const trip: Trip = {
      id: 'trip1',
      name: 'Goa',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      baseCurrency: '₹',
      memberIds: ['m1'],
      groupIds: [],
      ownerId: 'm1',
      joinCode: 'GOA1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const pacing = calculateBudgetPacing(trip, []);
    expect(pacing.hasBudget).toBe(false);
    expect(pacing.status).toBe('no_budget');
    expect(pacing.totalBudget).toBe(0);
    expect(pacing.totalTripDays).toBe(6);
  });

  it('calculates on-track daily allowance for an ongoing trip', () => {
    const trip: Trip = {
      id: 'trip1',
      name: 'Goa',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      baseCurrency: '₹',
      memberIds: ['m1'],
      groupIds: [],
      ownerId: 'm1',
      joinCode: 'GOA1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      budget: 60000,
    };

    // Today is Nov 12 (Day 3 of 6, 4 days remaining: 12, 13, 14, 15)
    const simulatedToday = '2026-11-12';

    const expenses: Expense[] = [
      makeExpense({ id: 'e1', amount: 10000, date: '2026-11-10', title: 'Dinner Day 1' }),
      makeExpense({ id: 'e2', amount: 8000, date: '2026-11-11', title: 'Stay Day 2' }),
      makeExpense({ id: 'e3', amount: 4000, date: '2026-11-12', title: 'Scooter rental today' }),
    ];

    const pacing = calculateBudgetPacing(trip, expenses, { today: simulatedToday });

    expect(pacing.hasBudget).toBe(true);
    expect(pacing.totalBudget).toBe(60000);
    expect(pacing.totalSpent).toBe(22000);
    expect(pacing.remainingBudget).toBe(38000);
    expect(pacing.totalTripDays).toBe(6);
    expect(pacing.elapsedDays).toBe(3);
    expect(pacing.remainingDays).toBe(4);
    expect(pacing.isOngoing).toBe(true);
    expect(pacing.plannedDailyBudget).toBe(10000);
    // Adjusted daily allowance: 42000 remaining entering today / 4 days = 10500/day
    expect(pacing.adjustedDailyAllowance).toBe(10500);
    expect(pacing.todaySpent).toBe(4000);
    // 4000 / 10500 = ~0.381
    expect(pacing.todayBurnRatio).toBeCloseTo(0.381, 2);
    expect(pacing.status).toBe('on_track');
  });

  it('detects high burn-rate warning when today spend exceeds target by > 25%', () => {
    const trip: Trip = {
      id: 'trip1',
      name: 'Goa',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      baseCurrency: '₹',
      memberIds: ['m1'],
      groupIds: [],
      ownerId: 'm1',
      joinCode: 'GOA1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      budget: 30000,
    };

    // Nov 12: Remaining days = 4. Spend before today = 10000.
    // Remaining budget = 20000. Adjusted daily allowance = 20000 / 4 = 5000.
    // Today spend = 8500 (ratio = 8500 / 5000 = 1.7x > 1.25x)
    const simulatedToday = '2026-11-12';
    const expenses: Expense[] = [
      makeExpense({ id: 'e1', amount: 10000, date: '2026-11-10', title: 'Hotel' }),
      makeExpense({ id: 'e2', amount: 8500, date: '2026-11-12', title: 'Fancy Dinner' }),
    ];

    const pacing = calculateBudgetPacing(trip, expenses, { today: simulatedToday });
    expect(pacing.status).toBe('warning');
    expect(pacing.todayBurnRatio).toBe(1.7);
    expect(pacing.statusMessage).toContain('1.7x daily burn');
  });

  it('detects over_budget when total spend exceeds trip budget', () => {
    const trip: Trip = {
      id: 'trip1',
      name: 'Goa',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      baseCurrency: '₹',
      memberIds: ['m1'],
      groupIds: [],
      ownerId: 'm1',
      joinCode: 'GOA1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      budget: 20000,
    };

    const expenses: Expense[] = [
      makeExpense({ id: 'e1', amount: 25000, date: '2026-11-10', title: 'Flights' }),
    ];

    const pacing = calculateBudgetPacing(trip, expenses, { today: '2026-11-11' });
    expect(pacing.status).toBe('over_budget');
    expect(pacing.remainingBudget).toBe(0);
    expect(pacing.statusMessage).toContain('5,000 over total budget');
  });

  it('correctly accounts for refunds netting out spend', () => {
    const trip: Trip = {
      id: 'trip1',
      name: 'Goa',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      baseCurrency: '₹',
      memberIds: ['m1'],
      groupIds: [],
      ownerId: 'm1',
      joinCode: 'GOA1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      budget: 10000,
    };

    const expenses: Expense[] = [
      makeExpense({ id: 'e1', amount: 5000, date: '2026-11-10', title: 'Original charge' }),
      makeExpense({
        id: 'e2',
        amount: 2000,
        date: '2026-11-10',
        title: 'Partial refund',
        ...({ isRefund: true } as unknown as object),
      }),
    ];

    const pacing = calculateBudgetPacing(trip, expenses, { today: '2026-11-10' });
    // Total spent should be 5000 - 2000 = 3000
    expect(pacing.totalSpent).toBe(3000);
    expect(pacing.remainingBudget).toBe(7000);
  });
});
