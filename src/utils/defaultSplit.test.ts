import { afterEach, describe, expect, it } from 'vitest';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as Storage;
}

import { loadDefaultSplit, saveDefaultSplit, copyDefaultSplit } from './defaultSplit';

describe('defaultSplit', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips a remembered split for a trip', () => {
    saveDefaultSplit('trip-1', {
      splitMode: 'exact',
      splitMemberIds: ['m1', 'm2'],
      splitConfig: { m1: 40, m2: 60 },
    });
    expect(loadDefaultSplit('trip-1')).toEqual({
      splitMode: 'exact',
      splitMemberIds: ['m1', 'm2'],
      splitConfig: { m1: 40, m2: 60 },
    });
    expect(loadDefaultSplit('trip-other')).toBeNull();
  });

  it('returns null for corrupt storage', () => {
    localStorage.setItem('tt-default-split:v1:trip-1', '{not-json');
    expect(loadDefaultSplit('trip-1')).toBeNull();
  });

  it('copies a remembered split onto a new trip with remapped member ids', () => {
    saveDefaultSplit('old', {
      splitMode: 'percentage',
      splitMemberIds: ['alice', 'bob', 'gone'],
      splitConfig: { alice: 70, bob: 30, gone: 0 },
    });
    const copied = copyDefaultSplit('old', 'new', { alice: 'a2', bob: 'b2' });
    expect(copied).toEqual({
      splitMode: 'percentage',
      splitMemberIds: ['a2', 'b2'],
      splitConfig: { a2: 70, b2: 30 },
    });
    expect(loadDefaultSplit('new')).toEqual(copied);
    expect(loadDefaultSplit('old')?.splitMemberIds).toEqual(['alice', 'bob', 'gone']);
  });

  it('returns null when no source members map onto the new trip', () => {
    saveDefaultSplit('old', { splitMode: 'equal', splitMemberIds: ['x'] });
    expect(copyDefaultSplit('old', 'new', { y: 'z' })).toBeNull();
    expect(loadDefaultSplit('new')).toBeNull();
  });
});
