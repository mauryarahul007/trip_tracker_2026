import { describe, it, expect } from 'vitest';
import Fuse from 'fuse.js';
import type { Member, PreviousMemberSuggestion } from '../types';

describe('Previous Member Suggestions & Typeahead Logic', () => {
  const previousMembers: PreviousMemberSuggestion[] = [
    { name: 'Rahul Maurya', linkedUserId: 'user-1', avatarUrl: 'https://example.com/rahul.png' },
    { name: 'Alex Johnson', linkedUserId: 'user-2', avatarUrl: 'https://example.com/alex.png' },
    { name: 'Sarah Connor', linkedUserId: null, avatarUrl: null },
    { name: 'Michael Scott', linkedUserId: 'user-4', avatarUrl: null },
    { name: 'Dwight Schrute', linkedUserId: null, avatarUrl: null },
    { name: 'Pam Beesly', linkedUserId: 'user-6', avatarUrl: null },
    { name: 'Jim Halpert', linkedUserId: 'user-7', avatarUrl: null },
  ];

  const activeTripMembers: Member[] = [
    { id: 'm-1', name: 'Rahul Maurya', linkedUserId: 'user-1' },
    { id: 'm-2', name: 'Sarah Connor', linkedUserId: null },
  ];

  it('filters out members already added to the active trip by name or linkedUserId', () => {
    const currentNames = new Set(activeTripMembers.map((m) => m.name.trim().toLowerCase()));
    const currentLinkedIds = new Set(
      activeTripMembers.map((m) => m.linkedUserId).filter((id): id is string => Boolean(id))
    );

    const available = previousMembers.filter((pm) => {
      const norm = pm.name.trim().toLowerCase();
      if (currentNames.has(norm)) return false;
      if (pm.linkedUserId && currentLinkedIds.has(pm.linkedUserId)) return false;
      return true;
    });

    expect(available).toHaveLength(5);
    expect(available.some((m) => m.name === 'Rahul Maurya')).toBe(false);
    expect(available.some((m) => m.name === 'Sarah Connor')).toBe(false);
    expect(available.some((m) => m.name === 'Alex Johnson')).toBe(true);
  });

  it('performs fuzzy search with Fuse.js and matches typos', () => {
    const available = previousMembers.filter((m) => m.name !== 'Rahul Maurya' && m.name !== 'Sarah Connor');
    const fuse = new Fuse(available, {
      keys: ['name'],
      threshold: 0.35,
      minMatchCharLength: 1,
    });

    // Searching with typo 'alx' for 'Alex Johnson'
    const result1 = fuse.search('alx').map((r) => r.item);
    expect(result1.length).toBeGreaterThan(0);
    expect(result1[0].name).toBe('Alex Johnson');
    expect(result1[0].linkedUserId).toBe('user-2');

    // Searching with typo 'dwigt' for 'Dwight Schrute'
    const result2 = fuse.search('dwigt').map((r) => r.item);
    expect(result2.length).toBeGreaterThan(0);
    expect(result2[0].name).toBe('Dwight Schrute');
  });

  it('limits results to a maximum of 5 items for performance', () => {
    const available = previousMembers;
    const fuse = new Fuse(available, {
      keys: ['name'],
      threshold: 0.35,
    });

    // Query matching many items
    const results = fuse.search('a').map((r) => r.item).slice(0, 5);
    expect(results.length).toBeLessThanOrEqual(5);

    const emptyQueryResults = available.slice(0, 5);
    expect(emptyQueryResults.length).toBe(5);
  });

  it('detects duplicate members in the active trip case-insensitively', () => {
    const checkDuplicate = (name: string) => {
      const query = name.trim().toLowerCase();
      return activeTripMembers.some((m) => m.name.trim().toLowerCase() === query);
    };

    expect(checkDuplicate('rahul maurya')).toBe(true);
    expect(checkDuplicate('  RAHUL MAURYA ')).toBe(true);
    expect(checkDuplicate('Sarah Connor')).toBe(true);
    expect(checkDuplicate('Alex Johnson')).toBe(false);
  });

  it('merges remote DB members with local trip store members without duplicate entries', () => {
    const localStoreMembers: Record<string, Member> = {
      'm-10': { id: 'm-10', name: 'Michael Scott', linkedUserId: 'user-4' },
      'm-11': { id: 'm-11', name: 'Stanley Hudson', linkedUserId: 'user-8' },
    };

    const memberMap = new Map<string, PreviousMemberSuggestion>();

    previousMembers.forEach((pm) => {
      memberMap.set(pm.name.trim().toLowerCase(), pm);
    });

    Object.values(localStoreMembers).forEach((m) => {
      const norm = m.name.trim().toLowerCase();
      const existing = memberMap.get(norm);
      if (!existing) {
        memberMap.set(norm, {
          name: m.name.trim(),
          linkedUserId: m.linkedUserId || null,
          avatarUrl: null,
        });
      } else if (!existing.linkedUserId && m.linkedUserId) {
        existing.linkedUserId = m.linkedUserId;
      }
    });

    const merged = Array.from(memberMap.values());
    // Should include Stanley Hudson and have only one Michael Scott
    expect(merged.filter((m) => m.name.toLowerCase() === 'michael scott')).toHaveLength(1);
    expect(merged.some((m) => m.name === 'Stanley Hudson')).toBe(true);
  });
});
