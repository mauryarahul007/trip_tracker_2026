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

export interface PullToRefreshState {
  /** Live drag distance in px, 0 when idle -- drive a visual indicator with this. */
  pullDistance: number;
  /** True once the pull has crossed the commit threshold -- release will refresh. */
  armed: boolean;
  /** True while the refresh callback is in flight. */
  refreshing: boolean;
}

const IDLE: PullToRefreshState = { pullDistance: 0, armed: false, refreshing: false };

/**
 * Vertical-only pull-to-refresh, gated to touch input and to gestures that
 * start with the container already scrolled to the top -- mirrors
 * useTabSwipe's shape (ref + effect + touch listeners + cleanup + gesture-id
 * guard) but tracks the opposite axis, so the two never fight over the same
 * gesture even when both are mounted on nearby elements.
 */
export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  onRefresh: () => void | Promise<void>
): PullToRefreshState {
  const [state, setState] = useState<PullToRefreshState>(IDLE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const touchStartY = useRef(0);
  const isDraggingRef = useRef(false);
  const gestureIdRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
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
        if (isDraggingRef.current) setState(IDLE);
        isDraggingRef.current = false;
        return;
      }
      if (!isDraggingRef.current) {
        if (dy < START_THRESHOLD_PX) return;
        isDraggingRef.current = true;
        gestureIdRef.current += 1;
      }
      e.preventDefault();
      const overflow = Math.max(0, dy - MAX_PULL_PX);
      const clamped = Math.min(dy, MAX_PULL_PX) + overflow * 0.15;
      const armed = clamped >= COMMIT_THRESHOLD_PX;
      if (armed && !stateRef.current.armed) triggerHaptic('medium');
      setState({ pullDistance: clamped, armed, refreshing: false });
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const wasArmed = stateRef.current.armed;
      if (wasArmed) {
        setState({ pullDistance: COMMIT_THRESHOLD_PX, armed: true, refreshing: true });
        Promise.resolve(onRefreshRef.current()).finally(() => setState(IDLE));
      } else {
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
  }, [containerRef]);

  return state;
}
