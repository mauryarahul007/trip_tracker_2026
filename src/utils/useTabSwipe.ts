import { useEffect } from 'react';
import type { RefObject } from 'react';
import { triggerHaptic } from './haptics';

const SWIPE_THRESHOLD = 70;
// Horizontal travel must clearly dominate vertical travel, or an ordinary
// vertical scroll (which always has some horizontal jitter on touch) would
// misfire as a tab change.
const MAX_VERTICAL_RATIO = 0.5;

/** Right-hand-friendly horizontal swipe between bottom-nav tabs, touch-only
 * (mirrors SwipeableRow's own pointerType gating). Passive throughout — it
 * never calls preventDefault, so it can't interfere with normal vertical
 * scrolling; it only judges the gesture after pointerup. Skips entirely
 * when the gesture starts inside an element marked `data-no-tab-swipe`
 * (a row that owns its own horizontal drag, e.g. SwipeableRow, or a map
 * that owns its own pan gesture, e.g. TripMapHero/TripJourneyMap). */
export function useTabSwipe<T extends string>(
  containerRef: RefObject<HTMLElement | null>,
  tabs: readonly T[],
  activeTab: T,
  onSwipe: (tab: T) => void
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (e.target instanceof Element && e.target.closest('[data-no-tab-swipe]')) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx) * MAX_VERTICAL_RATIO) return;

      const idx = tabs.indexOf(activeTab);
      if (idx === -1) return;
      // Swipe left (finger travels right-to-left) -> next tab.
      // Swipe right (finger travels left-to-right) -> previous tab.
      const nextIdx = dx < 0 ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= tabs.length) return;
      triggerHaptic('light');
      onSwipe(tabs[nextIdx]);
    };

    const handlePointerCancel = () => {
      tracking = false;
    };

    el.addEventListener('pointerdown', handlePointerDown, { passive: true });
    el.addEventListener('pointerup', handlePointerUp, { passive: true });
    el.addEventListener('pointercancel', handlePointerCancel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [containerRef, tabs, activeTab, onSwipe]);
}
