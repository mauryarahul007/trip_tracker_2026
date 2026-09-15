import { describe, it, expect } from 'vitest';
import { computeBurnRateInsight } from './burnRate';

describe('computeBurnRateInsight', () => {
  it('projects total spend from the daily average mid-trip', () => {
    const now = new Date(2026, 5, 3); // June 3, 2026 (month is 0-indexed)
    const result = computeBurnRateInsight('2026-06-01', '2026-06-05', 300, now);
    expect(result).not.toBeNull();
    expect(result!.daysTotal).toBe(5);
    expect(result!.daysElapsed).toBe(3);
    expect(result!.dailyAverage).toBeCloseTo(100);
    expect(result!.projectedTotal).toBeCloseTo(500);
  });

  it('returns null before the trip starts', () => {
    const now = new Date(2026, 5, 1);
    expect(computeBurnRateInsight('2026-06-10', '2026-06-15', 300, now)).toBeNull();
  });

  it('returns null after the trip ends', () => {
    const now = new Date(2026, 5, 20);
    expect(computeBurnRateInsight('2026-06-10', '2026-06-15', 300, now)).toBeNull();
  });

  it('returns null when nothing has been spent yet', () => {
    const now = new Date(2026, 5, 3);
    expect(computeBurnRateInsight('2026-06-01', '2026-06-05', 0, now)).toBeNull();
  });

  it('clamps daysElapsed to daysTotal on the last day', () => {
    const now = new Date(2026, 5, 5);
    const result = computeBurnRateInsight('2026-06-01', '2026-06-05', 500, now);
    expect(result!.daysElapsed).toBe(5);
    expect(result!.daysTotal).toBe(5);
  });

  it('handles a single-day trip', () => {
    const now = new Date(2026, 5, 1);
    const result = computeBurnRateInsight('2026-06-01', '2026-06-01', 200, now);
    expect(result!.daysTotal).toBe(1);
    expect(result!.daysElapsed).toBe(1);
    expect(result!.projectedTotal).toBeCloseTo(200);
  });
});
