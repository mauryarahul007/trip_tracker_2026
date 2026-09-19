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

  it('tracks finger 1:1 horizontally by default', () => {
    const t = frontCardTransform(150, 0, '2d');
    expect(t).toContain('translate3d(150px, 0px, 0)');
  });

  it('damps horizontal displacement when dampHorizontal is enabled', () => {
    const t = frontCardTransform(150, 0, '2d', true);
    expect(t).not.toContain('translate3d(150px,');
    expect(t).toContain(`translate3d(${rubberBand(150)}px,`);
  });
});

describe('peekCardTransform', () => {
  it('smoothly scales and rotates depth-1 peek card continuously', () => {
    const atRest = peekCardTransform(1, 0, '2d');
    expect(atRest.transform).toContain('translate3d(0, 14.0px, 0)');
    expect(atRest.transform).toContain('scale(0.960)');
    expect(atRest.transform).toContain('rotate(-2.50deg)');

    const atPeak = peekCardTransform(1, 1, '2d');
    expect(atPeak.transform).toContain('translate3d(0, 0.0px, 0)');
    expect(atPeak.transform).toContain('scale(1.000)');
    expect(atPeak.transform).toContain('rotate(0.00deg)');
  });

  it('smoothly scales and escalates depth-2 peek card', () => {
    const atRest = peekCardTransform(2, 0, '2d');
    expect(atRest.transform).toContain('translate3d(0, 26.0px, 0)');
    expect(atRest.transform).toContain('scale(0.920)');
    expect(atRest.transform).toContain('rotate(2.00deg)');
    expect(atRest.opacity).toBe('0.85');

    const atPeak = peekCardTransform(2, 1, '2d');
    expect(atPeak.transform).toContain('translate3d(0, 14.0px, 0)');
    expect(atPeak.transform).toContain('scale(0.960)');
    expect(atPeak.transform).toContain('rotate(-2.50deg)');
    expect(atPeak.opacity).toBe('1.00');
  });
});

describe('exitCardTransform', () => {
  it('exits on the compositor (translate3d)', () => {
    expect(exitCardTransform('left')).toContain('translate3d(-150%');
    expect(exitCardTransform('right')).toContain('translate3d(150%');
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
