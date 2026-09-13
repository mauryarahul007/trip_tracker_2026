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

import { loadDefaultSplit, saveDefaultSplit } from './defaultSplit';

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
});
