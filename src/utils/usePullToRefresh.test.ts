import { describe, expect, it } from 'vitest';
import { shouldStartPull } from './usePullToRefresh';

describe('shouldStartPull', () => {
  it('ignores short drags', () => {
    expect(shouldStartPull(20, 0)).toBe(false);
  });
  it('ignores diagonal drags', () => {
    expect(shouldStartPull(60, 40)).toBe(false);
  });
  it('accepts a deliberate vertical pull', () => {
    expect(shouldStartPull(60, 10)).toBe(true);
  });
});
