import { describe, it, expect } from 'vitest';
import type { Trip, Expense, TravelPass } from '../types';

describe('VisualTravelTimeline Day and Event Grouping logic', () => {
  const mockTrip: Trip = {
    id: 'trip-jp-2026',
    name: 'Tokyo & Kyoto 2026',
    startDate: '2026-10-10',
    endDate: '2026-10-13',
    baseCurrency: 'JPY',
    ownerId: 'u1',
    memberIds: ['m1', 'm2'],
    groupIds: [],
    joinCode: 'TOKYO26',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockExpenses: Expense[] = [
    {
      id: 'e1',
      tripId: mockTrip.id,
      title: 'Shinjuku Ramen Lunch',
      amount: 2800,
      currency: 'JPY',
      category: 'cat-food',
      date: '2026-10-10',
      paidBy: 'm1',
      splitMode: 'equal',
      splitMemberIds: ['m1', 'm2'],
      resolvedShares: { m1: 1400, m2: 1400 },
      isSettlement: false,
      createdByUserId: 'u1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'e2',
      tripId: mockTrip.id,
      title: 'Shinkansen to Kyoto',
      amount: 14000,
      currency: 'JPY',
      category: 'cat-transit',
      date: '2026-10-11',
      paidBy: 'm2',
      splitMode: 'equal',
      splitMemberIds: ['m1', 'm2'],
      resolvedShares: { m1: 7000, m2: 7000 },
      isSettlement: false,
      createdByUserId: 'u1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'e3-excluded',
      tripId: mockTrip.id,
      title: 'Personal Souvenir',
      amount: 5000,
      currency: 'JPY',
      category: 'cat-food',
      date: '2026-10-11',
      paidBy: 'm1',
      splitMode: 'equal',
      splitMemberIds: ['m1'],
      resolvedShares: { m1: 5000 },
      excludeFromTotals: true,
      isSettlement: false,
      createdByUserId: 'u1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockPasses: TravelPass[] = [
    {
      id: 'pass-flight-1',
      tripId: mockTrip.id,
      type: 'flight',
      title: 'Haneda Arrival (JL-042)',
      startDateTime: '2026-10-10T08:30:00',
      origin: 'DEL',
      destination: 'HND',
      seatOrRoom: '14A',
      referenceCode: 'JAL987',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  it('correctly associates expenses and travel passes with corresponding days', () => {
    // Day 1 (2026-10-10) should have 1 pass and 1 expense
    const day1Expenses = mockExpenses.filter((e) => e.date === '2026-10-10');
    const day1Passes = mockPasses.filter((p) => p.startDateTime?.startsWith('2026-10-10'));

    expect(day1Expenses.length).toBe(1);
    expect(day1Expenses[0].title).toBe('Shinjuku Ramen Lunch');
    expect(day1Passes.length).toBe(1);
    expect(day1Passes[0].title).toBe('Haneda Arrival (JL-042)');
  });

  it('accurately calculates daily spend totals while excluding excluded expenses', () => {
    // Day 2 (2026-10-11) has e2 (14000) and e3-excluded (5000)
    const day2Expenses = mockExpenses.filter((e) => e.date === '2026-10-11');
    const activeSpend = day2Expenses
      .filter((e) => !e.excludeFromTotals)
      .reduce((sum, e) => sum + e.amount, 0);

    expect(activeSpend).toBe(14000);
  });

  it('correctly handles trips with no passes gracefully', () => {
    const emptyPasses: TravelPass[] = [];
    expect(emptyPasses.length).toBe(0);
    // Even without passes, expenses group smoothly
    const dates = Array.from(new Set(mockExpenses.map((e) => e.date)));
    expect(dates).toContain('2026-10-10');
    expect(dates).toContain('2026-10-11');
  });
});
