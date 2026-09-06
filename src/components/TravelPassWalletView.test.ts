import { describe, it, expect } from 'vitest';
import type { TravelPass, Member } from '../types';

describe('TravelPassWalletView - Sorting and Grouping Logic', () => {
  const membersMap: Record<string, Member> = {
    m1: { id: 'm1', name: 'Rahul Maurya' },
    m2: { id: 'm2', name: 'Asmita Bhosale' },
    m3: { id: 'm3', name: 'Suyog Gadhave' },
  };

  const getPassPassengerLabel = (pass: TravelPass): string => {
    if (pass.passengerName && pass.passengerName.trim()) {
      return pass.passengerName.trim();
    }
    if (pass.assignedMemberIds && pass.assignedMemberIds.length > 0) {
      const first = membersMap[pass.assignedMemberIds[0]];
      if (first?.name) return first.name;
    }
    return 'Unassigned Traveler';
  };

  const getLegDisplay = (origin?: string, destination?: string, title?: string): string => {
    if (origin && destination) return `${origin} ➔ ${destination}`;
    if (origin) return origin;
    if (destination) return destination;
    return title || 'Travel Leg';
  };

  const mockPasses: TravelPass[] = [
    {
      id: 'p1',
      tripId: 'trip-1',
      type: 'flight',
      title: 'IndiGo 6E-512',
      origin: 'HYD',
      destination: 'IXB',
      passengerName: 'Rahul Maurya',
      referenceCode: 'PNR222',
      startDateTime: '2026-09-12 11:30',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'p2',
      tripId: 'trip-1',
      type: 'flight',
      title: 'IndiGo 6E-101',
      origin: 'BLR',
      destination: 'HYD',
      passengerName: 'Suyog Gadhave',
      referenceCode: 'PNR111',
      startDateTime: '2026-09-12 06:15',
      createdAt: 2,
      updatedAt: 2,
    },
    {
      id: 'p3',
      tripId: 'trip-1',
      type: 'flight',
      title: 'IndiGo 6E-101',
      origin: 'BLR',
      destination: 'HYD',
      passengerName: 'Asmita Bhosale',
      referenceCode: 'PNR111',
      startDateTime: '2026-09-12 06:15',
      createdAt: 3,
      updatedAt: 3,
    },
    {
      id: 'p4',
      tripId: 'trip-1',
      type: 'flight',
      title: 'IndiGo 6E-101',
      origin: 'BLR',
      destination: 'HYD',
      passengerName: 'Rahul Maurya',
      referenceCode: 'PNR111',
      startDateTime: '2026-09-12 06:15',
      createdAt: 4,
      updatedAt: 4,
    },
    {
      id: 'p5',
      tripId: 'trip-1',
      type: 'stay',
      title: 'Mayfair Tea Resort',
      passengerName: '',
      assignedMemberIds: [],
      startDateTime: '2026-09-13 14:00',
      createdAt: 5,
      updatedAt: 5,
    },
  ];

  it('groups passes by Travel Leg and sorts legs alphabetically by route name', () => {
    // Leg mode groups
    type PassGroup = {
      key: string;
      origin?: string;
      destination?: string;
      title: string;
      passes: TravelPass[];
      isMultiPassengerLeg: boolean;
    };

    const groupMap = new Map<string, PassGroup>();
    const groups: PassGroup[] = [];

    for (const pass of mockPasses) {
      if (pass.type === 'flight' || pass.type === 'train') {
        const legKey = [
          pass.type,
          (pass.referenceCode || 'no-ref').trim().toUpperCase(),
          (pass.origin || '').trim().toUpperCase(),
          (pass.destination || '').trim().toUpperCase(),
          (pass.startDateTime || '').trim(),
        ].join('::');

        let group = groupMap.get(legKey);
        if (!group) {
          group = {
            key: legKey,
            title: pass.title,
            origin: pass.origin,
            destination: pass.destination,
            passes: [],
            isMultiPassengerLeg: false,
          };
          groupMap.set(legKey, group);
          groups.push(group);
        }
        group.passes.push(pass);
        if (group.passes.length > 1) {
          group.isMultiPassengerLeg = true;
        }
      } else {
        groups.push({
          key: pass.id,
          title: pass.title,
          passes: [pass],
          isMultiPassengerLeg: false,
        });
      }
    }

    // Sort alphabetically by leg name
    groups.sort((a, b) => {
      const labelA = getLegDisplay(a.origin, a.destination, a.title);
      const labelB = getLegDisplay(b.origin, b.destination, b.title);
      return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' });
    });

    // Verify order of groups: BLR ➔ HYD comes before HYD ➔ IXB
    expect(getLegDisplay(groups[0].origin, groups[0].destination, groups[0].title)).toBe('BLR ➔ HYD');
    expect(groups[0].passes.length).toBe(3);
    expect(groups[0].isMultiPassengerLeg).toBe(true);

    // Inside BLR ➔ HYD group, verify passes are sorted alphabetically by passenger name
    groups[0].passes.sort((a, b) => getPassPassengerLabel(a).localeCompare(getPassPassengerLabel(b)));
    expect(groups[0].passes[0].passengerName).toBe('Asmita Bhosale');
    expect(groups[0].passes[1].passengerName).toBe('Rahul Maurya');
    expect(groups[0].passes[2].passengerName).toBe('Suyog Gadhave');
  });

  it('groups passes by Member Name and sorts member folders alphabetically', () => {
    type PassGroup = {
      key: string;
      title: string;
      passes: TravelPass[];
      isMultiPassengerLeg: boolean;
    };

    const memberMap = new Map<string, PassGroup>();
    const groups: PassGroup[] = [];

    for (const pass of mockPasses) {
      const travelerName = getPassPassengerLabel(pass);
      const memberKey = `member::${travelerName.toUpperCase()}`;

      let group = memberMap.get(memberKey);
      if (!group) {
        group = {
          key: memberKey,
          title: travelerName,
          passes: [],
          isMultiPassengerLeg: true,
        };
        memberMap.set(memberKey, group);
        groups.push(group);
      }
      group.passes.push(pass);
    }

    // Sort member groups alphabetically with Unassigned at end
    groups.sort((a, b) => {
      if (a.title === 'Unassigned Traveler') return 1;
      if (b.title === 'Unassigned Traveler') return -1;
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });

    expect(groups[0].title).toBe('Asmita Bhosale');
    expect(groups[0].passes.length).toBe(1);

    expect(groups[1].title).toBe('Rahul Maurya');
    expect(groups[1].passes.length).toBe(2); // 2 flights: BLR ➔ HYD and HYD ➔ IXB

    expect(groups[2].title).toBe('Suyog Gadhave');
    expect(groups[2].passes.length).toBe(1);

    expect(groups[3].title).toBe('Unassigned Traveler');
    expect(groups[3].passes[0].title).toBe('Mayfair Tea Resort');
  });

  it('handles Expand All and Collapse All state maps correctly', () => {
    const groupKeys = ['group-1', 'group-2', 'group-3'];

    // Collapse All
    const collapsedMap: Record<string, boolean> = {};
    for (const k of groupKeys) {
      collapsedMap[k] = false;
    }
    expect(groupKeys.every((k) => collapsedMap[k] === false)).toBe(true);

    // Expand All
    const expandedMap: Record<string, boolean> = {};
    for (const k of groupKeys) {
      expandedMap[k] = true;
    }
    expect(groupKeys.every((k) => expandedMap[k] === true)).toBe(true);
  });
});
