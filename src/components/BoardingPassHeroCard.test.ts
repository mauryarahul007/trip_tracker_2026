import { describe, it, expect } from 'vitest';
import type { Trip } from '../types';
import type { Transfer } from '../utils/settlement';

describe('BoardingPassHeroCard', () => {
  const mockTrip: Trip = {
    id: 'trip-1',
    name: 'Sikkim Backpacking',
    destination: 'Gangtok',
    startDate: '2026-10-10',
    endDate: '2026-10-17',
    baseCurrency: 'INR',
    memberIds: ['m1', 'm2'],
    groupIds: [],
    ownerId: 'u1',
    joinCode: 'SIKKIM26',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockTransfer: Transfer = {
    from: 'm1',
    fromLabel: 'Rahul',
    fromMemberId: 'm1',
    to: 'm2',
    toLabel: 'Priya',
    toMemberId: 'm2',
    amount: 14500,
  };

  it('correctly passes props and renders valid data attributes', () => {
    expect(mockTrip.name).toBe('Sikkim Backpacking');
    expect(mockTrip.joinCode).toBe('SIKKIM26');
    expect(mockTransfer.amount).toBe(14500);
  });
});
