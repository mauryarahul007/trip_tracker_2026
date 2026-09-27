// Regression: ISSUE-006 — Journeys "Spent" doubled for every trip that had
// been opened (local expenses were summed, then the server copies added again).
// Found by /qa on 2026-09-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-09-27.md
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/tripApi', () => ({ fetchAllExpensesForTrips: vi.fn() }));
vi.mock('../store/tripStore', () => ({ useTripStore: { getState: () => ({ expenses: [] }) } }));

import { sumTripSpending } from './useCrossTripBalances';

const row = (id: string, tripId: string, amount: number, extra: { isSettlement?: boolean; deletedAt?: number } = {}) =>
  ({ id, tripId, amount, isSettlement: false, ...extra });

describe('sumTripSpending', () => {
  it('counts an expense present both locally and on the server once', () => {
    const server = [row('a', 't1', 100), row('b', 't1', 50)];
    const local = [row('a', 't1', 100), row('b', 't1', 50)];
    expect(sumTripSpending(server, local)).toEqual({ t1: 150 });
  });
  it('adds local-only (not yet synced) expenses and skips settlements and deleted rows', () => {
    const server = [row('a', 't1', 100), row('s', 't1', 999, { isSettlement: true }), row('d', 't2', 70, { deletedAt: 1 })];
    const local = [row('a', 't1', 100), row('new', 't1', 25)];
    expect(sumTripSpending(server, local)).toEqual({ t1: 125 });
  });
});
