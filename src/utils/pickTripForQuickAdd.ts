import type { Trip } from '../types';

/** Open trip that is in dates today; otherwise the most recently updated open trip. */
export function pickTripForQuickAdd(
  trips: Trip[],
  today = new Date().toISOString().slice(0, 10),
): Trip | null {
  const open = trips.filter((t) => !t.archived && !t.closed);
  if (open.length === 0) return null;
  const inDates = open.filter((t) => {
    const start = t.startDate || t.endDate;
    const end = t.endDate || t.startDate;
    if (!start || !end) return false;
    return start <= today && today <= end;
  });
  const pool = inDates.length > 0 ? inDates : open;
  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    const t = pool[i];
    const tTime = t.updatedAt || t.createdAt || 0;
    const bTime = best.updatedAt || best.createdAt || 0;
    if (tTime > bTime) best = t;
  }
  return best;
}
