export interface BurnRateInsight {
  daysElapsed: number; // trip start through today, inclusive, clamped to [1, daysTotal]
  daysTotal: number; // trip start through end, inclusive
  dailyAverage: number;
  projectedTotal: number;
}

/**
 * Projects total trip spend from the daily average so far. Returns null when
 * the trip isn't currently in progress (hasn't started, already ended, or
 * has no valid date range) or there's nothing spent yet to average.
 */
export function computeBurnRateInsight(
  startDate: string,
  endDate: string,
  totalSpent: number,
  now: Date = new Date()
): BurnRateInsight | null {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (today < start || today > end) return null; // only meaningful mid-trip
  if (totalSpent <= 0) return null;

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const daysTotal = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  const daysElapsed = Math.min(daysTotal, Math.round((today.getTime() - start.getTime()) / MS_PER_DAY) + 1);

  const dailyAverage = totalSpent / daysElapsed;
  const projectedTotal = dailyAverage * daysTotal;

  return { daysElapsed, daysTotal, dailyAverage, projectedTotal };
}
