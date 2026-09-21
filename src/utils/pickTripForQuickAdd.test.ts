import { describe, expect, it } from 'vitest';
import type { Trip } from '../types';
import { pickTripForQuickAdd } from './pickTripForQuickAdd';

function trip(partial: Partial<Trip> & { id: string }): Trip {
  return {
    name: partial.id,
    startDate: '',
    endDate: '',
    baseCurrency: 'INR',
    memberIds: [],
    groupIds: [],
    ownerId: 'me',
    joinCode: 'ABC123',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe('pickTripForQuickAdd', () => {
  it('returns null when every trip is archived or closed', () => {
    expect(pickTripForQuickAdd([
      trip({ id: 'a', archived: true, updatedAt: 9 }),
      trip({ id: 'b', closed: true, updatedAt: 10 }),
    ], '2026-09-21')).toBeNull();
  });

  it('prefers a trip whose dates include today', () => {
    const picked = pickTripForQuickAdd([
      trip({ id: 'old', startDate: '2026-01-01', endDate: '2026-01-05', updatedAt: 99 }),
      trip({ id: 'now', startDate: '2026-09-20', endDate: '2026-09-22', updatedAt: 2 }),
    ], '2026-09-21');
    expect(picked?.id).toBe('now');
  });

  it('falls back to most recently updated open trip', () => {
    const picked = pickTripForQuickAdd([
      trip({ id: 'a', updatedAt: 5 }),
      trip({ id: 'b', updatedAt: 8 }),
      trip({ id: 'c', archived: true, updatedAt: 90 }),
    ], '2026-09-21');
    expect(picked?.id).toBe('b');
  });
});
