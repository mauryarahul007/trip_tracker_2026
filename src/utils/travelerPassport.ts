import type { Trip } from '../types';

export interface TravelerPassport {
  trips: number;
  destinations: number;
  tripsSettled: number;
  daysOnTheRoad: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// A typo'd end date should not turn one trip into a decade of travel.
const MAX_DAYS_PER_TRIP = 366;

/**
 * Lifetime stats from trips already on the device. Destination is free text,
 * so "destinations" is a case-insensitive distinct count, not countries. No
 * money is summed: trips can be in different currencies.
 */
export function computeTravelerPassport(trips: Trip[], now: number = Date.now()): TravelerPassport {
  const destinations = new Set<string>();
  let tripsSettled = 0;
  let daysOnTheRoad = 0;

  for (const t of trips) {
    const dest = t.destination?.trim().toLowerCase();
    if (dest) destinations.add(dest);
    if (t.closed) tripsSettled++;

    const start = Date.parse(t.startDate);
    const end = Date.parse(t.endDate);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start || start > now) continue;
    const lastDay = Math.min(end, now);
    daysOnTheRoad += Math.min(MAX_DAYS_PER_TRIP, Math.floor((lastDay - start) / DAY_MS) + 1);
  }

  return { trips: trips.length, destinations: destinations.size, tripsSettled, daysOnTheRoad };
}
