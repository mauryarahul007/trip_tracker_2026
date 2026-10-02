import { describe, expect, it } from 'vitest';
import type { Trip } from '../types';
import { applyRemoteTrip, mergeTripRoster } from './tripCollabMerge';

function trip(partial: Partial<Trip> & Pick<Trip, 'id'>): Trip {
  return {
    name: 'Sikkim',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    baseCurrency: 'INR',
    memberIds: ['m1'],
    groupIds: [],
    ownerId: 'owner',
    joinCode: 'ABC123',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe('applyRemoteTrip', () => {
  it('takes the other member checklist, notes, and passes', () => {
    const local = trip({
      id: 't1',
      checklist: [{ id: 'old', text: 'Passport', completed: false, createdAt: 1, updatedAt: 1 }],
      notes: [],
    });
    const remote = trip({
      id: 't1',
      name: 'Sikkim Bagpacking',
      memberIds: ['m1', 'm2'],
      checklist: [{ id: 'new', text: 'Raincoat', completed: false, createdAt: 2, updatedAt: 2 }],
      notes: [{ id: 'n1', title: 'Wi-Fi', content: 'lobby123', createdAt: 2, updatedAt: 2 }],
      updatedAt: 9,
    });

    const merged = applyRemoteTrip(local, remote, false);
    expect(merged.name).toBe('Sikkim Bagpacking');
    expect(merged.memberIds).toEqual(['m1', 'm2']);
    expect(merged.checklist?.map((item) => item.text)).toEqual(['Raincoat']);
    expect(merged.notes?.map((note) => note.title)).toEqual(['Wi-Fi']);
  });

  it('keeps local collab fields while a write is still in flight', () => {
    const local = trip({
      id: 't1',
      checklist: [{ id: 'mine', text: 'Power bank', completed: false, createdAt: 3, updatedAt: 3 }],
    });
    const remote = trip({
      id: 't1',
      name: 'Renamed',
      checklist: [],
      updatedAt: 4,
    });

    const merged = applyRemoteTrip(local, remote, true);
    expect(merged.name).toBe('Renamed');
    expect(merged.checklist?.map((item) => item.id)).toEqual(['mine']);
  });
});

describe('mergeTripRoster', () => {
  it('drops a member who left this trip and keeps members of other trips', () => {
    const local = trip({ id: 't1', memberIds: ['m1', 'gone'] });
    const other = trip({ id: 't2', memberIds: ['other'] });
    const remote = trip({ id: 't1', memberIds: ['m1', 'm2'] });

    const merged = mergeTripRoster(
      [local, other],
      {
        m1: { id: 'm1', name: 'A' },
        gone: { id: 'gone', name: 'Left' },
        other: { id: 'other', name: 'Elsewhere' },
      },
      {},
      't1',
      {
        trip: remote,
        members: {
          m1: { id: 'm1', name: 'A' },
          m2: { id: 'm2', name: 'B' },
        },
        groups: {},
      },
      false
    );

    expect(merged.members.gone).toBeUndefined();
    expect(merged.members.m2?.name).toBe('B');
    expect(merged.members.other?.name).toBe('Elsewhere');
    expect(merged.trips.find((t) => t.id === 't2')?.memberIds).toEqual(['other']);
  });
});
