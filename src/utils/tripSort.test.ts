import { describe, expect, it } from 'vitest';
import { sortTrips } from './tripSort';
import type { Trip } from '../types';

const t = (id: string, name: string, startDate?: string) => ({ id, name, startDate }) as Trip;

describe('sortTrips', () => {
  const trips = [t('1', 'goa', '2026-01-01'), t('2', 'Bali', '2026-03-01'), t('3', 'Agra', '2026-02-01')];
  it('name: case-insensitive A-Z', () => {
    expect(sortTrips(trips, 'name').map((x) => x.id)).toEqual(['3', '2', '1']);
  });
  it('date: newest first', () => {
    expect(sortTrips(trips, 'date').map((x) => x.id)).toEqual(['2', '3', '1']);
  });
});
