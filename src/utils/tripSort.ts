import type { Trip } from '../types';

export type TripSortMode = 'name' | 'date';

// Shared by the home stack and its pagination dots so both agree on order.
export function sortTrips(trips: Trip[], mode: TripSortMode): Trip[] {
  const byName = (a: Trip, b: Trip) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true });
  return [...trips].sort(
    mode === 'name'
      ? byName
      : (a, b) => {
          const dateA = a.startDate || '';
          const dateB = b.startDate || '';
          if (dateA && dateB && dateA !== dateB) return dateB.localeCompare(dateA);
          return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        }
  );
}
