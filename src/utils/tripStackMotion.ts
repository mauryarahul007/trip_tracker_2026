const SWIPE_THRESHOLD = 90;
const EXIT_TRANSITION_MS = 380;

export function isWebKitCompositor(): boolean {
  return typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('-webkit-touch-callout', 'none');
}

export type StackMotionMode = '2d' | '3d';

export function stackMotionMode(): StackMotionMode {
  return isWebKitCompositor() ? '2d' : '3d';
}

// Beyond `threshold`, extra drag distance is damped instead of following
// the finger 1:1 -- same elastic idea SwipeableRow already uses, so a
// stray drag doesn't send the card sailing off past the point a release
// would commit it anyway.
export function rubberBand(d: number, threshold: number = SWIPE_THRESHOLD): number {
  if (Math.abs(d) <= threshold) return d;
  const sign = d < 0 ? -1 : 1;
  const overflow = Math.abs(d) - threshold;
  return sign * (threshold + overflow * 0.45);
}

export function frontCardTransform(x: number, y: number, mode: StackMotionMode = '3d'): string {
  const renderX = rubberBand(x);
  const renderY = y < 0 ? -rubberBand(-y) : rubberBand(y);
  const tiltDeg = (renderX * 0.055).toFixed(2);
  if (mode === '2d') {
    return `translate3d(${renderX}px, ${renderY}px, 0) rotate(${tiltDeg}deg)`;
  }
  const rotateY = (renderX * 0.038).toFixed(2);
  const rotateX = (-renderY * 0.032).toFixed(2);
  return `translate3d(${renderX}px, ${renderY}px, 0) rotate(${tiltDeg}deg) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
}

export function peekCardTransform(
  depth: 1 | 2,
  p: number,
  mode: StackMotionMode = '3d',
): { transform: string; opacity?: string } {
  const clamped = Math.min(1, Math.max(0, p));
  if (depth === 1) {
    const dy = 14 - clamped * 14;
    if (mode === '2d') {
      return { transform: `translate3d(0, ${dy.toFixed(1)}px, 0)` };
    }
    const s = 0.96 + clamped * 0.04;
    const r = -2.5 + clamped * 2.5;
    return { transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg)` };
  }
  const dy = 26 - clamped * 12;
  const opacity = String(0.85 + clamped * 0.11);
  if (mode === '2d') {
    return { transform: `translate3d(0, ${dy.toFixed(1)}px, 0)`, opacity };
  }
  const s = 0.92 + clamped * 0.04;
  const r = 2 - clamped * 4.5;
  return {
    transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg)`,
    opacity,
  };
}

export function exitCardTransform(dir: 'left' | 'right' | 'up'): string {
  if (dir === 'left') return 'translate3d(-160%, 0, 0) rotate(-18deg) scale(0.9)';
  if (dir === 'right') return 'translate3d(160%, 0, 0) rotate(18deg) scale(0.9)';
  return 'translate3d(0, -140%, 0) scale(0.9) rotate(2deg)';
}

export { SWIPE_THRESHOLD, EXIT_TRANSITION_MS };
