import { describe, it, expect } from 'vitest';
import { resolveSnapPoint, SHEET_COLLAPSED_TOP } from '../utils/sheetSnap';

describe('resolveSnapPoint (touch drags rest on full or collapsed only)', () => {
  it('a short upward drag from collapsed opens fully in one swipe', () => {
    expect(resolveSnapPoint(40, 0, SHEET_COLLAPSED_TOP)).toBe(0);
    expect(resolveSnapPoint(30, 0, SHEET_COLLAPSED_TOP)).toBe(0);
  });

  it('a tiny nudge from collapsed springs back', () => {
    expect(resolveSnapPoint(47, 0, SHEET_COLLAPSED_TOP)).toBe(SHEET_COLLAPSED_TOP);
  });

  it('a quick flick commits regardless of distance', () => {
    expect(resolveSnapPoint(49, -0.2, SHEET_COLLAPSED_TOP)).toBe(0);
    expect(resolveSnapPoint(1, 0.2, 0)).toBe(SHEET_COLLAPSED_TOP);
  });

  it('a short downward drag from full collapses, a tiny one springs back', () => {
    expect(resolveSnapPoint(10, 0, 0)).toBe(SHEET_COLLAPSED_TOP);
    expect(resolveSnapPoint(3, 0, 0)).toBe(0);
  });

  it('never rests on the old 80% step after a touch drag', () => {
    for (const v of [30, 25, 20, 15]) expect([0, SHEET_COLLAPSED_TOP]).toContain(resolveSnapPoint(v, 0, SHEET_COLLAPSED_TOP));
  });
});
