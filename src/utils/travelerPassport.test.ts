import { describe, expect, it } from 'vitest';
import type { Trip } from '../types';
import { computeTravelerPassport } from './travelerPassport';

const trip = (over: Partial<Trip>): Trip => ({
  id: 't',
  name: 'T',
  startDate: '2026-01-01',
  endDate: '2026-01-03',
  baseCurrency: 'INR',
  memberIds: [],
  groupIds: [],
  ownerId: 'u',
  joinCode: 'ABC123',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const NOW = Date.parse('2026-06-01');

describe('computeTravelerPassport', () => {
  it('is all zeros with no trips', () => {
    expect(computeTravelerPassport([], NOW)).toEqual({ trips: 0, destinations: 0, tripsSettled: 0, daysOnTheRoad: 0 });
  });

  it('counts distinct destinations case-insensitively and ignores blanks', () => {
    const p = computeTravelerPassport(
      [trip({ destination: 'Goa' }), trip({ destination: ' goa ' }), trip({ destination: 'Bali' }), trip({ destination: '  ' }), trip({})],
      NOW
    );
    expect(p.destinations).toBe(2);
    expect(p.trips).toBe(5);
  });

  it('counts closed trips as settled', () => {
    expect(computeTravelerPassport([trip({ closed: true }), trip({ closed: false }), trip({})], NOW).tripsSettled).toBe(1);
  });

  it('sums inclusive days for past trips, clips future trips out and in-progress trips to today', () => {
    const past = trip({ startDate: '2026-01-01', endDate: '2026-01-03' }); // 3 days
    const future = trip({ startDate: '2026-09-01', endDate: '2026-09-05' }); // not started
    const inProgress = trip({ startDate: '2026-05-30', endDate: '2026-06-10' }); // 30 May..1 Jun = 3 days
    expect(computeTravelerPassport([past, future, inProgress], NOW).daysOnTheRoad).toBe(6);
  });

  it('caps a single trip and skips bad or reversed dates', () => {
    const long = trip({ startDate: '2020-01-01', endDate: '2026-01-01' });
    const reversed = trip({ startDate: '2026-02-01', endDate: '2026-01-01' });
    const bad = trip({ startDate: 'nope', endDate: 'nope' });
    expect(computeTravelerPassport([long, reversed, bad], NOW).daysOnTheRoad).toBe(366);
  });
});
