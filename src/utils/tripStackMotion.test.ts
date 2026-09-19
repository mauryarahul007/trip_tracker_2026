import { describe, expect, it, vi } from 'vitest';
import {
  exitCardTransform,
  frontCardTransform,
  peekCardTransform,
  rubberBand,
  SWIPE_THRESHOLD,
  isWebKitCompositor,
  stackMotionMode,
} from './tripStackMotion';

describe('rubberBand', () => {
  it('follows the finger until the swipe threshold', () => {
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(SWIPE_THRESHOLD)).toBe(SWIPE_THRESHOLD);
    expect(rubberBand(-SWIPE_THRESHOLD)).toBe(-SWIPE_THRESHOLD);
  });

  it('damps overflow past the threshold', () => {
    expect(rubberBand(SWIPE_THRESHOLD + 100)).toBe(SWIPE_THRESHOLD + 45);
    expect(rubberBand(-(SWIPE_THRESHOLD + 100))).toBe(-(SWIPE_THRESHOLD + 45));
  });
});

describe('frontCardTransform', () => {
  it('uses 2D compositor primitives on WebKit (no rotateX/Y)', () => {
    const t = frontCardTransform(40, -20, '2d');
    expect(t).toContain('translate3d(');
    expect(t).toContain('rotate(');
    expect(t).not.toContain('rotateY');
    expect(t).not.toContain('rotateX');
  });

  it('keeps 3D tilt on Blink', () => {
    const t = frontCardTransform(40, -20, '3d');
    expect(t).toContain('rotateY(');
    expect(t).toContain('rotateX(');
  });
});

describe('peekCardTransform', () => {
  it('only translates peek cards in 2D mode', () => {
    const d1 = peekCardTransform(1, 0.5, '2d');
    expect(d1.transform).toMatch(/^translate3d\(/);
    expect(d1.transform).not.toContain('scale(');
    expect(d1.transform).not.toContain('rotate(');
  });

  it('scales and rotates peek cards in 3D mode', () => {
    const d1 = peekCardTransform(1, 1, '3d');
    expect(d1.transform).toContain('scale(');
    expect(d1.transform).toContain('rotate(');
  });
});

describe('exitCardTransform', () => {
  it('exits on the compositor (translate3d)', () => {
    expect(exitCardTransform('left')).toContain('translate3d(-160%');
    expect(exitCardTransform('right')).toContain('translate3d(160%');
    expect(exitCardTransform('up')).toContain('translate3d(0, -140%');
  });
});

describe('stackMotionMode', () => {
  it('picks 2d when WebKit touch-callout is supported', () => {
    vi.stubGlobal('CSS', { supports: (prop: string) => prop === '-webkit-touch-callout' });
    expect(isWebKitCompositor()).toBe(true);
    expect(stackMotionMode()).toBe('2d');
    vi.unstubAllGlobals();
  });

  it('picks 3d on Blink', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    expect(isWebKitCompositor()).toBe(false);
    expect(stackMotionMode()).toBe('3d');
    vi.unstubAllGlobals();
  });
});
