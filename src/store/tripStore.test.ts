import { describe, it, expect, vi, afterEach } from 'vitest';
import { collectDirtyExpenseIds, mergeServerExpenses, resolvePendingLocation } from './tripStore';
import type { Expense } from '../types';

vi.mock('../utils/geolocation', () => ({
  searchPlaces: vi.fn(),
  reverseGeocode: vi.fn(),
}));

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
