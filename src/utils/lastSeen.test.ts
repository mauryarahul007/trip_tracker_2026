import { describe, expect, it } from 'vitest';
import { formatLastSeen } from './lastSeen';

describe('formatLastSeen', () => {
  const now = Date.parse('2026-09-15T12:00:00.000Z');

  it('says just now under a minute', () => {
    expect(formatLastSeen(new Date(now - 20_000).toISOString(), now)).toBe('just now');
  });

  it('uses minutes then hours then days', () => {
    expect(formatLastSeen(new Date(now - 5 * 60_000).toISOString(), now)).toBe('5m ago');
    expect(formatLastSeen(new Date(now - 3 * 3600_000).toISOString(), now)).toBe('3h ago');
    expect(formatLastSeen(new Date(now - 2 * 86400_000).toISOString(), now)).toBe('2d ago');
  });
});
