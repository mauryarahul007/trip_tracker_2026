import { describe, it, expect, vi, afterEach } from 'vitest';
import { collectDirtyExpenseIds, mergeServerExpenses, resolvePendingLocation, getTripNotificationRecipients, filterTripsOwnedByUser, isNonRetryableSyncError, DEFAULT_CATEGORIES, useTripStore } from './tripStore';
import type { Expense, Member, Trip } from '../types';

vi.mock('../utils/geolocation', () => ({
  searchPlaces: vi.fn(),
  reverseGeocode: vi.fn(),
}));

vi.mock('../services/tripApi', async () => {
  const actual = await vi.importActual<typeof import('../services/tripApi')>('../services/tripApi');
  return { ...actual, insertTripGraph: vi.fn().mockRejectedValue(new Error('offline')) };
});

const { searchPlaces, reverseGeocode } = await import('../utils/geolocation');

function makeExpense(overrides: Partial<Expense> & { id: string; tripId: string }): Expense {
  return {
    title: 'Test expense',
    amount: 10,
    currency: 'INR',
    category: 'cat-misc',
    date: '2026-01-01',
    paidBy: 'member-1',
    splitMode: 'equal',
    splitMemberIds: ['member-1'],
    resolvedShares: { 'member-1': 10 },
    isSettlement: false,
    createdByUserId: 'user-1',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('collectDirtyExpenseIds', () => {
  it('collects tempId for addExpense items', () => {
    const ids = collectDirtyExpenseIds([{ type: 'addExpense', payload: { tempId: 'temp-1', expenseData: {} } }]);
    expect(ids.has('temp-1')).toBe(true);
  });

  it('collects id for update/delete/restore items', () => {
    const ids = collectDirtyExpenseIds([
      { type: 'deleteExpense', payload: { id: 'exp-1' } },
      { type: 'updateExpense', payload: { id: 'exp-2', expenseData: {} } },
      { type: 'restoreExpense', payload: { id: 'exp-3' } },
    ]);
    expect(ids.has('exp-1')).toBe(true);
    expect(ids.has('exp-2')).toBe(true);
    expect(ids.has('exp-3')).toBe(true);
  });
});

describe('isNonRetryableSyncError', () => {
  it('flags an RLS-blocked update as non-retryable', () => {
    const err = new Error("Expense update for exp-1 affected 0 rows (blocked by a database policy or the expense no longer exists)");
    expect(isNonRetryableSyncError(err)).toBe(true);
  });

  it('treats a network/transient error as retryable', () => {
    expect(isNonRetryableSyncError(new Error('Failed to fetch'))).toBe(false);
    expect(isNonRetryableSyncError('not an Error instance')).toBe(false);
  });
});

describe('mergeServerExpenses', () => {
  it('replaces the active trip with server data when nothing is dirty', () => {
    const local = [makeExpense({ id: 'stale-1', tripId: 'trip-a' })];
    const server = [makeExpense({ id: 'fresh-1', tripId: 'trip-a' })];
    const merged = mergeServerExpenses(local, server, 'trip-a', new Set());
    expect(merged.map((e) => e.id)).toEqual(['fresh-1']);
  });

  it('preserves other trips cached locally, untouched by this refresh', () => {
    const local = [makeExpense({ id: 'other-trip-exp', tripId: 'trip-b' })];
    const server = [makeExpense({ id: 'fresh-1', tripId: 'trip-a' })];
    const merged = mergeServerExpenses(local, server, 'trip-a', new Set());
    expect(merged.map((e) => e.id).sort()).toEqual(['fresh-1', 'other-trip-exp']);
  });

  it('keeps a locally-dirty (queued, unconfirmed) expense instead of dropping it', () => {
    // A temp-ID expense from an offline addExpense that hasn't synced yet —
    // the server fetch legitimately doesn't know about it.
    const local = [makeExpense({ id: 'temp-pending', tripId: 'trip-a' })];
    const server: Expense[] = [];
    const merged = mergeServerExpenses(local, server, 'trip-a', new Set(['temp-pending']));
    expect(merged.map((e) => e.id)).toEqual(['temp-pending']);
  });

  it('does not resurrect a locally-deleted expense the server hasn\'t caught up on', () => {
    // deleteExpense already moved this out of `expenses` locally (it lives
    // in deletedExpenses instead), so it's absent from `local` even though
    // the server's list — fetched before the delete synced — still has it.
    const server = [makeExpense({ id: 'pending-delete', tripId: 'trip-a' })];
    const merged = mergeServerExpenses([], server, 'trip-a', new Set(['pending-delete']));
    expect(merged.map((e) => e.id)).toEqual([]);
  });

  it('prefers the local edit over stale server data for a pending update', () => {
    const local = [makeExpense({ id: 'exp-1', tripId: 'trip-a', title: 'Edited locally' })];
    const server = [makeExpense({ id: 'exp-1', tripId: 'trip-a', title: 'Stale server copy' })];
    const merged = mergeServerExpenses(local, server, 'trip-a', new Set(['exp-1']));
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Edited locally');
  });
});

describe('loadDemoTrip', () => {
  // Regression test: the offline fallback used to reuse DEFAULT_CATEGORIES
  // as `result.categories`, which the caller then spread on top of
  // DEFAULT_CATEGORIES again — doubling every category (BUG-030).
  it('does not duplicate default categories when insertTripGraph fails (offline path)', async () => {
    await useTripStore.getState().loadDemoTrip();
    const ids = useTripStore.getState().categories.map((c) => c.id);
    expect(ids).toEqual([...new Set(ids)]);
    expect(ids).toHaveLength(DEFAULT_CATEGORIES.length);
  });
});

function makeTrip(overrides: Partial<Trip> & { id: string; memberIds: string[] }): Trip {
  return {
    name: 'Test trip',
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    baseCurrency: 'INR',
    groupIds: [],
    ownerId: 'user-1',
    joinCode: 'ABC123',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeMember(overrides: Partial<Member> & { id: string }): Member {
  return {
    name: 'Test member',
    ...overrides,
  };
}

describe('getTripNotificationRecipients', () => {
  // Regression test for the cross-trip push notification leak: `members`
  // is a flat map spanning every trip the user belongs to, so recipients
  // must be scoped through the trip's own memberIds, not filtered
  // directly off the full members map.
  it('only includes linked users belonging to the given trip, not other trips', () => {
    const trips = [
      makeTrip({ id: 'trip-a', memberIds: ['member-a1', 'member-a2'] }),
      makeTrip({ id: 'trip-b', memberIds: ['member-b1'] }),
    ];
    const members = {
      'member-a1': makeMember({ id: 'member-a1', linkedUserId: 'user-actor' }), // the actor themself
      'member-a2': makeMember({ id: 'member-a2', linkedUserId: 'user-trip-a-friend' }),
      'member-b1': makeMember({ id: 'member-b1', linkedUserId: 'user-trip-b-friend' }),
    };

    const recipients = getTripNotificationRecipients(trips, members, 'trip-a', 'user-actor');

    expect(recipients).toEqual(['user-trip-a-friend']);
    expect(recipients).not.toContain('user-trip-b-friend');
  });

  it('excludes unlinked and archived members, and the acting user', () => {
    const trips = [makeTrip({ id: 'trip-a', memberIds: ['m1', 'm2', 'm3', 'm4'] })];
    const members = {
      m1: makeMember({ id: 'm1', linkedUserId: 'user-actor' }), // acting user
      m2: makeMember({ id: 'm2', linkedUserId: null }), // unclaimed member
      m3: makeMember({ id: 'm3', linkedUserId: 'user-archived', archived: true }), // archived
      m4: makeMember({ id: 'm4', linkedUserId: 'user-valid' }),
    };

    const recipients = getTripNotificationRecipients(trips, members, 'trip-a', 'user-actor');

    expect(recipients).toEqual(['user-valid']);
  });

  it('returns an empty array for an unknown trip id', () => {
    const recipients = getTripNotificationRecipients([], {}, 'missing-trip', 'user-actor');
    expect(recipients).toEqual([]);
  });
});

describe('filterTripsOwnedByUser', () => {
  // Regression test: importDatabase used to re-insert every trip in a
  // backup unconditionally, including trips the importing user had only
  // joined (not owned). Since Clear All Data / delete is owner-scoped,
  // those joined trips were never actually gone, so re-importing them
  // created a duplicate owned by the importer.
  it('keeps trips owned by the user and drops trips only joined', () => {
    const trips = [
      makeTrip({ id: 'owned', memberIds: [], ownerId: 'user-1' }),
      makeTrip({ id: 'joined', memberIds: [], ownerId: 'someone-else' }),
    ];
    const result = filterTripsOwnedByUser(trips, 'user-1');
    expect(result.map((t) => t.id)).toEqual(['owned']);
  });

  it('keeps legacy trips with no ownerId field for backward compatibility', () => {
    const trips = [makeTrip({ id: 'legacy', memberIds: [], ownerId: undefined as unknown as string })];
    const result = filterTripsOwnedByUser(trips, 'user-1');
    expect(result.map((t) => t.id)).toEqual(['legacy']);
  });

  it('filters out trips that already exist in active account when existingTripIds is provided', () => {
    const trips = [
      makeTrip({ id: 'existing-trip', memberIds: [], ownerId: 'user-1' }),
      makeTrip({ id: 'new-trip', memberIds: [], ownerId: 'someone-else' }),
    ];
    const result = filterTripsOwnedByUser(trips, 'user-1', ['existing-trip']);
    expect(result.map((t) => t.id)).toEqual(['new-trip']);
  });
});

describe('resolvePendingLocation', () => {
  afterEach(() => {
    vi.mocked(searchPlaces).mockReset();
    vi.mocked(reverseGeocode).mockReset();
  });

  it('resolves a manually typed pending name to coordinates when a match is found', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce([{ lat: 12.34, lng: 56.78, placeName: 'Some Cafe, City' }]);
    const result = await resolvePendingLocation({ lat: 0, lng: 0, placeName: 'some cafe', pendingName: 'some cafe' });
    expect(result).toEqual({ lat: 12.34, lng: 56.78, placeName: 'Some Cafe, City' });
  });

  it('flags locationUnresolved when a pending name has no matches', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce([]);
    const result = await resolvePendingLocation({ lat: 0, lng: 0, placeName: 'zzzz nonsense', pendingName: 'zzzz nonsense' });
    expect(result).toEqual({ lat: 0, lng: 0, placeName: 'zzzz nonsense', pendingName: 'zzzz nonsense', locationUnresolved: true });
  });

  it('upgrades an offline coord-fallback placeName via reverse geocoding', async () => {
    vi.mocked(reverseGeocode).mockResolvedValueOnce('Real Place Name');
    const result = await resolvePendingLocation({ lat: 12.345, lng: 67.891, placeName: '12.345°, 67.891°' });
    expect(result).toEqual({ lat: 12.345, lng: 67.891, placeName: 'Real Place Name' });
  });

  it('leaves an already-resolved location untouched', async () => {
    const location = { lat: 1, lng: 2, placeName: 'Already Resolved' };
    const result = await resolvePendingLocation(location);
    expect(result).toEqual(location);
    expect(searchPlaces).not.toHaveBeenCalled();
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it('passes through null/undefined location unchanged', async () => {
    expect(await resolvePendingLocation(null)).toBeNull();
    expect(await resolvePendingLocation(undefined)).toBeUndefined();
  });
});
