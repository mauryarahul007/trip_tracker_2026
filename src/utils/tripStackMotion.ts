const SWIPE_THRESHOLD = 85;
const EXIT_TRANSITION_MS = 320;

export function isWebKitCompositor(): boolean {
  return typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('-webkit-touch-callout', 'none');
}

export type StackMotionMode = '2d' | '3d';

export function stackMotionMode(): StackMotionMode {
  return isWebKitCompositor() ? '2d' : '3d';
}

// Rubber-bands displacement beyond threshold (used for single-card decks or over-drag)
export function rubberBand(d: number, threshold: number = SWIPE_THRESHOLD): number {
  if (Math.abs(d) <= threshold) return d;
  const sign = d < 0 ? -1 : 1;
  const overflow = Math.abs(d) - threshold;
  return sign * (threshold + overflow * 0.45);
}

// Front card transform: 1:1 responsive tracking with dynamic tilt
export function frontCardTransform(
  x: number,
  y: number,
  mode: StackMotionMode = '3d',
  dampHorizontal: boolean = false,
): string {
  const renderX = dampHorizontal ? rubberBand(x) : x;
  const renderY = rubberBand(y, 140);
  const tiltDeg = (renderX * 0.065).toFixed(2);
  if (mode === '2d') {
    return `translate3d(${renderX}px, ${renderY}px, 0) rotate(${tiltDeg}deg)`;
  }
  const rotateY = (renderX * 0.038).toFixed(2);
  const rotateX = (-renderY * 0.032).toFixed(2);
  return `translate3d(${renderX}px, ${renderY}px, 0) rotate(${tiltDeg}deg) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
}

// Peek card transform: continuous 2D affine interpolation matching rest CSS
export function peekCardTransform(
  depth: 1 | 2,
  p: number,
  _mode: StackMotionMode = '3d',
): { transform: string; opacity?: string } {
  const clamped = Math.min(1, Math.max(0, p));
  if (depth === 1) {
    const dy = 14 - clamped * 14;
    const s = 0.96 + clamped * 0.04;
    const r = -2.5 + clamped * 2.5;
    return {
      transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg)`,
    };
  }
  const dy = 26 - clamped * 12;
  const s = 0.92 + clamped * 0.04;
  const r = 2 - clamped * 4.5;
  const opacity = String((0.85 + clamped * 0.15).toFixed(2));
  return {
    transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg)`,
    opacity,
  };
}

export function exitCardTransform(dir: 'left' | 'right' | 'up'): string {
  if (dir === 'left') return 'translate3d(-150%, 0, 0) rotate(-16deg) scale(0.92)';
  if (dir === 'right') return 'translate3d(150%, 0, 0) rotate(16deg) scale(0.92)';
  return 'translate3d(0, -140%, 0) scale(0.92) rotate(2deg)';
}

export { SWIPE_THRESHOLD, EXIT_TRANSITION_MS };
