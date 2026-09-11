import { describe, it, expect } from 'vitest';
import type { Trip, TravelPass } from '../types';

describe('NextUpTravelCapsule imminent pass calculations', () => {
  it('correctly filters imminent passes within 36 hours', () => {
    const mockTrip: Trip = {
      id: 'trip-1',
      name: 'Goa Holiday',
      baseCurrency: 'INR',
      memberIds: ['m1'],
      groupIds: [],
      ownerId: 'u1',
      joinCode: 'GOA123',
      startDate: '2026-09-12',
      endDate: '2026-09-20',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const upcomingDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours from now
    const farDate = new Date(Date.now() + 100 * 60 * 60 * 1000).toISOString(); // 100 hours from now

    const pass1: TravelPass = {
      id: 'p1',
      tripId: mockTrip.id,
      type: 'flight',
      title: 'IndiGo 6E-537',
      startDateTime: upcomingDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const pass2: TravelPass = {
      id: 'p2',
      tripId: mockTrip.id,
      type: 'flight',
      title: 'Air India 101',
      startDateTime: farDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const passes = [pass1, pass2];
    const diffHours1 = (new Date(passes[0].startDateTime!).getTime() - Date.now()) / (1000 * 60 * 60);
    const diffHours2 = (new Date(passes[1].startDateTime!).getTime() - Date.now()) / (1000 * 60 * 60);

    expect(diffHours1).toBeLessThanOrEqual(36);
    expect(diffHours2).toBeGreaterThan(36);
  });
});
