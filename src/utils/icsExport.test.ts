import { describe, it, expect } from 'vitest';
import { generateTripIcs } from './icsExport';
import type { Trip } from '../types';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 't1',
    name: 'Goa Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    baseCurrency: 'INR',
    memberIds: [],
    groupIds: [],
    ownerId: 'u1',
    joinCode: 'ABC123',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('generateTripIcs', () => {
  it('produces a valid VCALENDAR wrapper with no events for a trip without passes', () => {
    const ics = generateTripIcs(makeTrip());
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('emits one VEVENT per pass with a startDateTime', () => {
    const trip = makeTrip({
      passes: [
        {
          id: 'p1',
          tripId: 't1',
          type: 'flight',
          title: 'Flight to Goa',
          origin: 'DEL',
          destination: 'GOI',
          startDateTime: '2026-01-01T08:00:00Z',
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: 'p2',
          tripId: 't1',
          type: 'stay',
          title: 'Hotel check-in',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    });

    const ics = generateTripIcs(trip);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(1);
    expect(ics).toContain('SUMMARY:Flight to Goa');
    expect(ics).toContain('LOCATION:DEL → GOI');
    expect(ics).toContain('DTSTART:20260101T080000Z');
  });

  it('skips passes without a startDateTime', () => {
    const trip = makeTrip({
      passes: [
        { id: 'p3', tripId: 't1', type: 'activity', title: 'City tour', createdAt: 0, updatedAt: 0 },
      ],
    });
    expect(generateTripIcs(trip)).not.toContain('BEGIN:VEVENT');
  });
});
