import { describe, expect, it } from 'vitest';
import {
  buildItineraryTimeline,
  extractPassDateAndTime,
  formatTimeDisplay,
  getDirectionsUrl,
} from './itineraryTimeline';
import type { Expense, ItineraryItem, TravelPass } from '../types';

describe('itineraryTimeline utilities', () => {
  it('formats time to 12-hour AM/PM string', () => {
    expect(formatTimeDisplay('09:15')).toBe('9:15 AM');
    expect(formatTimeDisplay('14:30')).toBe('2:30 PM');
    expect(formatTimeDisplay('00:00')).toBe('12:00 AM');
    expect(formatTimeDisplay('12:00')).toBe('12:00 PM');
    expect(formatTimeDisplay('')).toBe('');
  });

  it('generates valid Google Maps search URLs', () => {
    expect(getDirectionsUrl('Colosseum, Rome')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Colosseum%2C%20Rome'
    );
    expect(getDirectionsUrl('')).toBe('');
  });

  it('extracts date and time from TravelPass', () => {
    const passWithTime: TravelPass = {
      id: 'p1',
      tripId: 't1',
      type: 'flight',
      title: 'Flight AF123',
      startDateTime: '2026-10-12T09:30:00',
      createdAt: 1000,
      updatedAt: 1000,
    };
    expect(extractPassDateAndTime(passWithTime)).toEqual({
      date: '2026-10-12',
      time: '09:30',
    });

    const passDateOnly: TravelPass = {
      id: 'p2',
      tripId: 't1',
      type: 'stay',
      title: 'Hotel Rome',
      startDateTime: '2026-10-12',
      createdAt: 1000,
      updatedAt: 1000,
    };
    expect(extractPassDateAndTime(passDateOnly)).toEqual({
      date: '2026-10-12',
      time: '09:00',
    });
  });

  it('builds unified chronological timeline grouping activities, passes, and expenses', () => {
    const activities: ItineraryItem[] = [
      {
        id: 'act1',
        tripId: 't1',
        date: '2026-10-12',
        time: '15:00',
        title: 'Colosseum Guided Tour',
        category: 'sightseeing',
        location: 'Piazza del Colosseo',
        completed: true,
      },
      {
        id: 'act2',
        tripId: 't1',
        date: '2026-10-12',
        time: '20:00',
        title: 'Dinner at Roscioli',
        category: 'food',
        completed: false,
      },
    ];

    const passes: TravelPass[] = [
      {
        id: 'p1',
        tripId: 't1',
        type: 'flight',
        title: 'Flight to Rome',
        startDateTime: '2026-10-12T09:30:00',
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 't1',
        title: 'Museum Entry Tickets',
        amount: 50,
        date: '2026-10-12',
        paidBy: 'm1',
        splitMemberIds: ['m1'],
        splitMode: 'equal',
        category: 'cat-sightseeing',
        currency: 'EUR',
        resolvedShares: { m1: 50 },
        isSettlement: false,
        createdByUserId: 'u1',
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const days = buildItineraryTimeline({
      tripStartDate: '2026-10-12',
      tripEndDate: '2026-10-14',
      activities,
      passes,
      expenses,
      todayIso: '2026-10-12',
    });

    // Should include Day 1 (Oct 12), Day 2 (Oct 13), Day 3 (Oct 14)
    expect(days.length).toBe(3);
    const day1 = days[0];
    expect(day1.date).toBe('2026-10-12');
    expect(day1.dayNumber).toBe(1);
    expect(day1.isToday).toBe(true);
    expect(day1.totalSpend).toBe(50);
    expect(day1.completedActivitiesCount).toBe(1);
    expect(day1.totalActivitiesCount).toBe(2);

    // Items within Day 1 sorted by time:
    // 09:30 Pass -> 12:00 Expense -> 15:00 Activity -> 20:00 Activity
    expect(day1.items.length).toBe(4);
    expect(day1.items[0].kind).toBe('pass');
    expect(day1.items[0].time).toBe('09:30');
    expect(day1.items[1].kind).toBe('expense');
    expect(day1.items[1].time).toBe('12:00');
    expect(day1.items[2].kind).toBe('activity');
    expect(day1.items[2].time).toBe('15:00');
    expect(day1.items[3].kind).toBe('activity');
    expect(day1.items[3].time).toBe('20:00');

    // Day 2 should be empty of items but exist in schedule
    const day2 = days[1];
    expect(day2.date).toBe('2026-10-13');
    expect(day2.dayNumber).toBe(2);
    expect(day2.items.length).toBe(0);
  });
});
