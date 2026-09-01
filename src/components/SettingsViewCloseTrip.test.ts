import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Trip } from '../types';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as Storage;
}

vi.mock('../services/tripApi', async () => {
  const actual = await vi.importActual<typeof import('../services/tripApi')>('../services/tripApi');
  return {
    ...actual,
    closeTripRow: vi.fn().mockResolvedValue(undefined),
  };
});

import { useTripStore } from '../store/tripStore';

describe('Trip Close & Lifecycle Settings', () => {
  const testTripId = '11111111-1111-1111-1111-111111111111';
  const testTrip: Trip = {
    id: testTripId,
    name: 'Goa Reunion 2026',
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    baseCurrency: 'INR',
    memberIds: ['m1', 'm2'],
    groupIds: [],
    ownerId: 'u1',
    joinCode: 'GOA2026',
    closed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    useTripStore.setState({
      trips: [{ ...testTrip, closed: false }],
      activeTripId: testTripId,
      members: {
        m1: { id: 'm1', name: 'Rahul' },
        m2: { id: 'm2', name: 'Priya' },
      },
      expenses: [],
      storageError: null,
      userId: 'u1',
    });
  });

  it('toggles trip closed status to true when closing', async () => {
    const { closeTrip } = useTripStore.getState();
    await closeTrip(testTripId, true);

    const updatedTrip = useTripStore.getState().trips.find((t) => t.id === testTripId);
    expect(updatedTrip?.closed).toBe(true);
  });

  it('toggles trip closed status back to false when reopening', async () => {
    const { closeTrip } = useTripStore.getState();
    await closeTrip(testTripId, true);
    expect(useTripStore.getState().trips.find((t) => t.id === testTripId)?.closed).toBe(true);

    await closeTrip(testTripId, false);
    expect(useTripStore.getState().trips.find((t) => t.id === testTripId)?.closed).toBe(false);
  });

  it('prevents adding new expenses when trip is closed', async () => {
    const { closeTrip, addExpense } = useTripStore.getState();
    await closeTrip(testTripId, true);

    await addExpense({
      title: 'Dinner at Beach Shack',
      amount: 2500,
      currency: 'INR',
      paidBy: 'm1',
      splitMemberIds: ['m1', 'm2'],
      splitMode: 'equal',
      category: 'cat-food',
      date: '2026-11-02',
    });

    expect(useTripStore.getState().storageError).toBe('This trip is closed. Reopen it to add expenses.');
    expect(useTripStore.getState().expenses.length).toBe(0);
  });

  it('matches spotlight search keywords for trip completion and close', () => {
    const searchAliases = [
      'close',
      'reopen',
      'lock',
      'unlock',
      'complete',
      'completed',
      'completion',
      'settled',
      'post trip',
      'finish',
      'archive trip',
    ];

    const matchesSearch = (query: string, text: string, keywords: string[]) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return text.toLowerCase().includes(q) || keywords.some((k) => k.toLowerCase().includes(q));
    };

    // When active, title is 'Close Trip'
    for (const query of ['complete', 'completion', 'close', 'lock', 'settled', 'post trip', 'finish']) {
      expect(matchesSearch(query, 'Close Trip', searchAliases)).toBe(true);
    }

    // When closed, title is 'Reopen Trip'
    for (const query of ['reopen', 'unlock', 'close']) {
      expect(matchesSearch(query, 'Reopen Trip', searchAliases)).toBe(true);
    }
  });
});
