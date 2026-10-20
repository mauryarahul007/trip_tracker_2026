import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { triggerHaptic } from './haptics';

// Distance the finger must travel past the container's top before release
// triggers a refresh -- short of this, the pull just springs back.
const COMMIT_THRESHOLD_PX = 90;
// Clamp how far the visual indicator can be dragged, with rubber-banding
// past the commit threshold so it doesn't feel like it can pull forever.
const MAX_PULL_PX = 120;
const START_THRESHOLD_PX = 32;
// Scale applied to finger travel so the pull feels deliberate.
const PULL_DAMPING = 0.6;
// Pane must have rested at scrollTop 0 this long before a touch can arm,
// so momentum bounces at the top don't read as a pull.
const TOP_SETTLE_MS = 150;
// Horizontal drift allowed relative to vertical travel.
const MAX_DX_RATIO = 0.5;

/** Pure gate: may a drag with these deltas begin pulling? */
export function shouldStartPull(dy: number, dx: number): boolean {
  return dy >= START_THRESHOLD_PX && dx <= dy * MAX_DX_RATIO;
}
// Height the indicator settles to while the refresh is in flight.
const REFRESHING_HEIGHT_PX = 40;
const SETTLE_TRANSITION = 'height 0.22s ease-out';

export interface PullToRefreshState {
  /** True from the moment a drag arms past the commit threshold through the end of the refresh. */
  armed: boolean;
  /** True while the refresh callback is in flight. */
  refreshing: boolean;
}

const IDLE: PullToRefreshState = { armed: false, refreshing: false };

/**
 * Vertical-only pull-to-refresh, gated to touch input and to gestures that
 * start with the container already scrolled to the top -- mirrors
 * useTabSwipe's shape (ref + effect + touch listeners + cleanup) but tracks
 * the opposite axis, so the two never fight over the same gesture even when
 * both are mounted on nearby elements.
 *
 * The live drag distance is written straight to `indicatorRef`'s `height`
 * style on every touchmove instead of through React state -- a setState per
 * touchmove was forcing a full re-render of the screen underneath (trip
 * cards, backdrop, everything) on every frame of the drag, which is what
 * made the gesture feel choppy. React state now only changes on the rare,
 * discrete transitions (armed crossing, drag end, refresh start/end), which
 * is cheap; the continuous 60-120Hz part never touches the render tree.
 */
export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLElement | null>,
  onRefresh: () => void | Promise<void>,
  enabled = true
): PullToRefreshState {
  const [state, setState] = useState<PullToRefreshState>(IDLE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isDraggingRef = useRef(false);
  // True only when the current gesture began with the pane resting at the top.
  const eligibleRef = useRef(false);
  const lastScrolledAtRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setIndicatorHeight = (px: number, animated: boolean) => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.transition = animated ? SETTLE_TRANSITION : 'none';
    el.style.height = `${px}px`;
  };

  useEffect(() => {
    if (!enabled) {
      setIndicatorHeight(0, false);
      setState(IDLE);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollTop > 0) lastScrolledAtRef.current = Date.now();
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Always reset so a stale anchor from a previous gesture can't leak in.
      eligibleRef.current = false;
      isDraggingRef.current = false;
      touchStartY.current = 0;
      touchStartX.current = 0;
      if (e.touches.length !== 1 || stateRef.current.refreshing) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('button, a, input, select, textarea, [role="button"], .trips-screen-header, .settings-drawer')) {
        return;
      }
      if (el.scrollTop > 0) return;
      if (Date.now() - lastScrolledAtRef.current < TOP_SETTLE_MS) return;
      eligibleRef.current = true;
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isDraggingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!eligibleRef.current || e.touches.length !== 1 || stateRef.current.refreshing) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      if (dy <= 0 || el.scrollTop > 0) {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setIndicatorHeight(0, true);
          setState(IDLE);
        }
        return;
      }
      if (!isDraggingRef.current) {
        if (!shouldStartPull(dy, dx)) return;
        isDraggingRef.current = true;
      }
      e.preventDefault();
      const damped = (dy - START_THRESHOLD_PX) * PULL_DAMPING;
      const overflow = Math.max(0, damped - MAX_PULL_PX);
      const clamped = Math.min(damped, MAX_PULL_PX) + overflow * 0.15;
      setIndicatorHeight(clamped, false);
      const armed = clamped >= COMMIT_THRESHOLD_PX;
      if (armed !== stateRef.current.armed) {
        if (armed) triggerHaptic('medium');
        setState({ armed, refreshing: false });
      }
    };

    const handleTouchEnd = () => {
      eligibleRef.current = false;
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const wasArmed = stateRef.current.armed;
      if (wasArmed) {
        setIndicatorHeight(REFRESHING_HEIGHT_PX, true);
        setState({ armed: true, refreshing: true });
        Promise.resolve(onRefreshRef.current()).finally(() => {
          setIndicatorHeight(0, true);
          setState(IDLE);
        });
      } else {
        setIndicatorHeight(0, true);
        setState(IDLE);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- indicatorRef is a stable ref object, not a reactive dependency
  }, [containerRef, enabled]);

  return state;
}
