import { useEffect, useState } from 'react';
import type { Trip } from '../types';
import { useTripStore } from '../store/tripStore';
import { fetchAllExpensesForTrips } from '../services/tripApi';
import { calculateSettlements } from '../utils/settlement';

export interface CrossTripBalances {
  // Net "you owe / you're owed" balance, summed per currency across every
  // trip the user belongs to. Grouped by currency rather than converted to
  // one number: FX rates drift, and a wrong blended total is worse than no
  // total for a money screen.
  byCurrency: Record<string, number>;
  // Trip-wide settled state (no transfers needed among any member), keyed
  // by trip id. Not user-specific -- matches the "Settled" state shown in
  // the trip's own detail view.
  settledTripIds: Record<string, boolean>;
}

const EMPTY: CrossTripBalances = { byCurrency: {}, settledTripIds: {} };

// Fetches fresh expenses server-side (not the possibly-partial local
// store) so a trip's true settled state is reflected even for trips the
// user hasn't opened this session -- the local zustand `expenses` store
// only holds a trip's full expense set once that trip has actually been
// opened, so computing balances from it for other trips can be wrong.
export function useCrossTripBalances(trips: Trip[], userId: string | null): CrossTripBalances {
  const [result, setResult] = useState<CrossTripBalances>(EMPTY);
  const tripIdsKey = trips.map((t) => t.id).join(',');

  useEffect(() => {
    if (!userId || trips.length === 0 || !navigator.onLine) {
      setResult(EMPTY);
      return;
    }
    let cancelled = false;
    const tripsSnapshot = trips;
    fetchAllExpensesForTrips(tripsSnapshot.map((t) => t.id))
      .then((allExpenses) => {
        if (cancelled) return;
        const { members: curMembers, groups: curGroups } = useTripStore.getState();
        const byCurrency: Record<string, number> = {};
        const settledTripIds: Record<string, boolean> = {};
        tripsSnapshot.forEach((trip) => {
          const tripGroups = Object.values(curGroups).filter((g) => trip.groupIds.includes(g.id));
          const { balances: tripBalances, transfers } = calculateSettlements(trip, curMembers, allExpenses, tripGroups);
          settledTripIds[trip.id] = transfers.length === 0;

          const myMemberId = trip.memberIds.find((id) => curMembers[id]?.linkedUserId === userId);
          if (!myMemberId) return;
          const mine = tripBalances.find((b) => b.memberId === myMemberId)?.balance ?? 0;
          if (Math.abs(mine) < 0.01) return;
          byCurrency[trip.baseCurrency] = Number(((byCurrency[trip.baseCurrency] || 0) + mine).toFixed(2));
        });
        setResult({ byCurrency, settledTripIds });
      })
      .catch(() => { if (!cancelled) setResult(EMPTY); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- members/groups read fresh via getState() at resolve time, not tracked as deps
  }, [tripIdsKey, userId]);

  return result;
}
