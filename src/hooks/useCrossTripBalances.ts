import { useEffect, useState } from 'react';
import type { Trip } from '../types';
import { useTripStore } from '../store/tripStore';
import { fetchAllExpensesForTrips } from '../services/tripApi';
import { calculateSettlements } from '../utils/settlement';

// Net "you owe / you're owed" balance, summed per currency across every
// trip the user belongs to. Grouped by currency rather than converted to
// one number: FX rates drift, and a wrong blended total is worse than no
// total for a money screen. Fetches fresh expenses server-side (not the
// possibly-partial local store) so a trip's true settled state is reflected
// even for trips the user hasn't opened this session.
export function useCrossTripBalances(trips: Trip[], userId: string | null): Record<string, number> {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const tripIdsKey = trips.map((t) => t.id).join(',');

  useEffect(() => {
    if (!userId || trips.length === 0 || !navigator.onLine) {
      setBalances({});
      return;
    }
    let cancelled = false;
    const tripsSnapshot = trips;
    fetchAllExpensesForTrips(tripsSnapshot.map((t) => t.id))
      .then((allExpenses) => {
        if (cancelled) return;
        const { members: curMembers, groups: curGroups } = useTripStore.getState();
        const byCurrency: Record<string, number> = {};
        tripsSnapshot.forEach((trip) => {
          const myMemberId = trip.memberIds.find((id) => curMembers[id]?.linkedUserId === userId);
          if (!myMemberId) return;
          const tripGroups = Object.values(curGroups).filter((g) => trip.groupIds.includes(g.id));
          const { balances: tripBalances } = calculateSettlements(trip, curMembers, allExpenses, tripGroups);
          const mine = tripBalances.find((b) => b.memberId === myMemberId)?.balance ?? 0;
          if (Math.abs(mine) < 0.01) return;
          byCurrency[trip.baseCurrency] = Number(((byCurrency[trip.baseCurrency] || 0) + mine).toFixed(2));
        });
        setBalances(byCurrency);
      })
      .catch(() => { if (!cancelled) setBalances({}); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- members/groups read fresh via getState() at resolve time, not tracked as deps
  }, [tripIdsKey, userId]);

  return balances;
}
