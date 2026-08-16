import { describe, it, expect } from 'vitest';
import { stampCacheName } from './stampServiceWorker.mjs';

describe('stampCacheName', () => {
  it('replaces the CACHE_NAME value with a build-specific suffix', () => {
    const source = `const CACHE_NAME = 'trip-tracker-cache-v1';\nconst other = 1;`;

    const result = stampCacheName(source, 'abc123');

    expect(result).toBe(`const CACHE_NAME = 'trip-tracker-cache-abc123';\nconst other = 1;`);
  });

  it('throws if no CACHE_NAME declaration is found', () => {
    expect(() => stampCacheName('no cache name here', 'abc123')).toThrow();
  });
});
