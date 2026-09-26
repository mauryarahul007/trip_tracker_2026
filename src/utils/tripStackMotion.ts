const SWIPE_THRESHOLD = 85;
const EXIT_TRANSITION_MS = 320;

export function isWebKitCompositor(): boolean {
  return typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('-webkit-touch-callout', 'none');
}

export type StackMotionMode = '2d' | '3d';

export function stackMotionMode(): StackMotionMode {
  // rotateX/rotateY under perspective warped the card on a slow drag and
  // let the photo paint past the rounded corners. Flat tilt on every browser.
  return '2d';
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
  _mode: StackMotionMode = '2d',
  dampHorizontal: boolean = false,
): string {
  const renderX = dampHorizontal ? rubberBand(x) : x;
  const renderY = rubberBand(y, 140);
  // ~2° at a full swipe. Stronger tilt reads as a warp while the finger is still down.
  const tiltDeg = (renderX * 0.024).toFixed(2);
  return `translate3d(${renderX}px, ${renderY}px, 0) rotate(${tiltDeg}deg)`;
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
    const s = 0.95 + clamped * 0.05;
    return {
      transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)})`,
    };
  }
  const dy = 26 - clamped * 12;
  const s = 0.9 + clamped * 0.05;
  const opacity = String((0.88 + clamped * 0.12).toFixed(2));
  return {
    transform: `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(3)})`,
    opacity,
  };
}

// The hidden "previous trip" card rises from behind while dragging right,
// mirroring what the depth-1 peek does when dragging left.
export function prevCardTransform(p: number): { transform: string; opacity: string } {
  const c = Math.min(1, Math.max(0, p));
  return {
    transform: `translate3d(0, ${(34 - c * 34).toFixed(1)}px, 0) scale(${(0.9 + c * 0.1).toFixed(3)})`,
    // Fully opaque by a third of the way, so the next-trip peek it sits
    // over doesn't show through.
    opacity: String(Math.min(1, 0.01 + c * 3).toFixed(2)),
  };
}

export function exitCardTransform(dir: 'left' | 'right' | 'up'): string {
  if (dir === 'left') return 'translate3d(-150%, 0, 0) rotate(-16deg) scale(0.92)';
  if (dir === 'right') return 'translate3d(150%, 0, 0) rotate(16deg) scale(0.92)';
  return 'translate3d(0, -140%, 0) scale(0.92) rotate(2deg)';
}

export { SWIPE_THRESHOLD, EXIT_TRANSITION_MS };
