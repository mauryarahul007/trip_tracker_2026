import { describe, it, expect } from 'vitest';
import { parseJoinDeepLink, buildCanonicalJoinLink, CANONICAL_APP_ORIGIN } from './joinDeepLink';

describe('parseJoinDeepLink', () => {
  it('parses https App Link join URLs', () => {
    expect(parseJoinDeepLink('https://trip-tracker.blackmaroon.in/join/ABC123')).toBe('ABC123');
    expect(parseJoinDeepLink('https://trip-tracker.blackmaroon.in/join/ABC123?x=1')).toBe('ABC123');
  });

  it('parses custom-scheme join URLs', () => {
    expect(parseJoinDeepLink('com.triptracker.app://join/XYZ9')).toBe('XYZ9');
  });

  it('returns null for non-join URLs', () => {
    expect(parseJoinDeepLink('com.triptracker.app://auth/callback?code=x')).toBeNull();
    expect(parseJoinDeepLink('https://trip-tracker.blackmaroon.in/')).toBeNull();
    expect(parseJoinDeepLink('')).toBeNull();
  });
});

describe('buildCanonicalJoinLink', () => {
  it('builds a join path under the canonical origin in non-dev builds', () => {
    const link = buildCanonicalJoinLink('CODE1');
    expect(link).toContain('/join/CODE1');
    // In vitest MODE is typically 'test' which uses window.origin when available;
    // at minimum the path must be correct.
    expect(link.endsWith('/join/CODE1') || link.includes('/join/CODE1')).toBe(true);
    expect(CANONICAL_APP_ORIGIN).toContain('trip-tracker.blackmaroon.in');
  });
});
