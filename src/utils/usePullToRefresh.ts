import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { triggerHaptic } from './haptics';

// Distance the finger must travel past the container's top before release
// triggers a refresh -- short of this, the pull just springs back.
const COMMIT_THRESHOLD_PX = 70;
// Clamp how far the visual indicator can be dragged, with rubber-banding
// past the commit threshold so it doesn't feel like it can pull forever.
const MAX_PULL_PX = 120;
const START_THRESHOLD_PX = 6;
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
  const isDraggingRef = useRef(false);
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

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || stateRef.current.refreshing) return;
      if (el.scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      isDraggingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || stateRef.current.refreshing) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy <= 0 || el.scrollTop > 0) {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setIndicatorHeight(0, true);
          setState(IDLE);
        }
        return;
      }
      if (!isDraggingRef.current) {
        if (dy < START_THRESHOLD_PX) return;
        isDraggingRef.current = true;
      }
      e.preventDefault();
      const overflow = Math.max(0, dy - MAX_PULL_PX);
      const clamped = Math.min(dy, MAX_PULL_PX) + overflow * 0.15;
      setIndicatorHeight(clamped, false);
      const armed = clamped >= COMMIT_THRESHOLD_PX;
      if (armed !== stateRef.current.armed) {
        if (armed) triggerHaptic('medium');
        setState({ armed, refreshing: false });
      }
    };

    const handleTouchEnd = () => {
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

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- indicatorRef is a stable ref object, not a reactive dependency
  }, [containerRef, enabled]);

  return state;
}
