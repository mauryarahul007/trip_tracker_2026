import { describe, it, expect } from 'vitest';
import pkg from '../../package.json';
import { CHANGELOG_ENTRIES } from './changelog';

describe('changelog', () => {
  it('has an entry for the current package.json version', () => {
    expect(CHANGELOG_ENTRIES.some((e) => e.version === pkg.version)).toBe(true);
  });

  it('has non-empty changes and unique versions', () => {
    const versions = CHANGELOG_ENTRIES.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
    CHANGELOG_ENTRIES.forEach((e) => expect(e.changes.length).toBeGreaterThan(0));
  });
});
