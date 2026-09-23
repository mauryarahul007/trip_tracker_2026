import { describe, expect, it } from 'vitest';
import {
  STACK_CHROME_FALLBACK_PX,
  stackChromePx,
} from './stackChrome';

describe('stackChromePx', () => {
  it('sums fixed chrome and the known gaps, skipping a missing stepper', () => {
    expect(stackChromePx({
      paddingTop: 20,
      paddingBottom: 28,
      header: 64,
      section: 28,
      netRow: 0,
      stepper: 0,
      launcher: 80,
    })).toBe(20 + 28 + 64 + 28 + 80 + 6 + 4 + 6);
  });

  it('adds the stepper gap only when the pager is on screen', () => {
    const base = {
      paddingTop: 8,
      paddingBottom: 14,
      header: 48,
      section: 24,
      netRow: 32,
      launcher: 70,
    };
    const without = stackChromePx({ ...base, stepper: 0 });
    const withPager = stackChromePx({ ...base, stepper: 6 });
    expect(withPager - without).toBe(6 + 16);
  });

  it('falls back when nothing has been measured yet', () => {
    expect(stackChromePx({
      paddingTop: 0,
      paddingBottom: 0,
      header: 0,
      section: 0,
      netRow: 0,
      stepper: 0,
      launcher: 0,
    })).toBe(STACK_CHROME_FALLBACK_PX);
  });
});
