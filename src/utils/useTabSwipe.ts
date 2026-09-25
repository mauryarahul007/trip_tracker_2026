import { useEffect, useRef, useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { triggerHaptic } from './haptics';

// Horizontal travel must clearly dominate vertical travel, or an ordinary
// vertical scroll (which always has some horizontal jitter on touch) would
// misfire as a tab change.
const MAX_VERTICAL_RATIO = 0.5;
const START_THRESHOLD_PX = 10;
// Fraction of the container's width the finger must cross to commit to the
// next/previous tab; below this (and below the velocity flick threshold) the
// pane springs back to where it started.
const COMMIT_RATIO = 0.28;
// A fast flick commits even short of COMMIT_RATIO, same idea as a native
// page-view swiper -- px/ms.
const FLICK_VELOCITY = 0.5;
// A touch starting within this many px of the container's left/right edge
// still arms the page swipe even over a row that normally owns horizontal
// drag (data-no-tab-swipe="row") -- lets tab navigation coexist with
// SwipeableRow's full-width delete/edit gesture instead of losing to it.
export const EDGE_ZONE_PX = 28;
const SETTLE_MS = 260;
const SETTLE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

type Direction = 'prev' | 'next';

interface DragState {
  active: boolean;
  settling: boolean;
  direction: Direction | null;
  deltaPercent: number; // -100..100, live during drag, animates to 0 or ±100 while settling
}

const IDLE: DragState = { active: false, settling: false, direction: null, deltaPercent: 0 };

const HORIZONTAL_STRIP = '.filter-chips-track, .filter-chips-collapse, .filter-chips-scroll, [data-horizontal-scroll]';

/** True when this touch should start a tab change. Vertical tab panes scroll
 * on Y, so a wide card inside one must not cancel the gesture. Real
 * horizontal strips (chips, data-horizontal-scroll) and non-edge row swipes
 * still opt out. */
export function shouldStartTabSwipe(
  target: HTMLElement,
  container: HTMLElement,
  clientX: number,
  readOverflowX: (el: HTMLElement) => string,
): boolean {
  const noSwipeEl = target.closest('[data-no-tab-swipe]');
  if (noSwipeEl) {
    const rect = container.getBoundingClientRect();
    const inEdgeZone =
      clientX - rect.left <= EDGE_ZONE_PX || rect.right - clientX <= EDGE_ZONE_PX;
    if (noSwipeEl.getAttribute('data-no-tab-swipe') !== 'row' || !inEdgeZone) return false;
  }

  if (target.closest(HORIZONTAL_STRIP)) return false;

  let current: HTMLElement | null = target;
  while (current && current !== container) {
    if (!current.classList.contains('tab-pane') && current.scrollWidth > current.clientWidth + 2) {
      const overflowX = readOverflowX(current);
      if (overflowX === 'auto' || overflowX === 'scroll') return false;
    }
    current = current.parentElement;
  }
  return true;
}

type TabSwipeHost = HTMLElement & {
  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions | boolean): void;
  removeEventListener(type: string, listener: EventListener): void;
};

/** Attaches the gesture listeners. A null host (trip screen not mounted yet)
 * is a no-op so a later mount can bind. */
export function bindTabSwipe(
  host: TabSwipeHost | null,
  createHandlers: (el: TabSwipeHost) => {
    start: (e: TouchEvent) => void;
    move: (e: TouchEvent) => void;
    end: (e: TouchEvent) => void;
    cancel: () => void;
  },
): () => void {
  if (!host) return () => {};
  const handlers = createHandlers(host);
  host.addEventListener('touchstart', handlers.start as EventListener, { passive: true });
  host.addEventListener('touchmove', handlers.move as EventListener, { passive: false });
  host.addEventListener('touchend', handlers.end as EventListener);
  host.addEventListener('touchcancel', handlers.cancel as EventListener);
  return () => {
    host.removeEventListener('touchstart', handlers.start as EventListener);
    host.removeEventListener('touchmove', handlers.move as EventListener);
    host.removeEventListener('touchend', handlers.end as EventListener);
    host.removeEventListener('touchcancel', handlers.cancel as EventListener);
  };
}

export interface TabSwipeRender<T extends string> {
  /** Style overrides for the currently active tab's pane. Spread after the
   * pane's own `display` logic so it only takes effect during a live drag
   * or its settle animation -- at rest it's an empty object. */
  activePaneStyle: CSSProperties;
  /** The adjacent tab currently sliding into view mid-gesture, or null when
   * idle. Render this tab's pane (normally hidden) with previewPaneStyle. */
  previewTab: T | null;
  previewPaneStyle: CSSProperties;
}

/** Right-hand-friendly horizontal swipe between bottom-nav tabs that visually
 * tracks the finger (WhatsApp/native-viewpager style) instead of jump-cutting
 * on release. Touch-only (mirrors SwipeableRow's own pointerType gating),
 * modeled on TripContentSheet's touch handling for a consistent feel. Skips
 * entirely when the gesture starts inside an element marked
 * `data-no-tab-swipe` (a row that owns its own horizontal drag, e.g.
 * SwipeableRow, or a map that owns its own pan gesture, e.g.
 * TripMapHero/TripJourneyMap). */
export function useTabSwipe<T extends string>(
  host: HTMLElement | null,
  tabs: readonly T[],
  activeTab: T,
  onSwipe: (tab: T) => void
): TabSwipeRender<T> {
  const [drag, setDrag] = useState<DragState>(IDLE);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const startTime = useRef(0);
  const isDraggingRef = useRef(false);
  const deltaPercentRef = useRef(0);
  const containerWidth = useRef(1);
  const activeIndexRef = useRef(tabs.indexOf(activeTab));
  activeIndexRef.current = tabs.indexOf(activeTab);
  const gestureIdRef = useRef(0);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    return bindTabSwipe(host, (el) => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const startTouch = e.touches[0];

      if (!shouldStartTabSwipe(
        target,
        el,
        startTouch.clientX,
        (node) => window.getComputedStyle(node).overflowX,
      )) return;

      touchStartX.current = startTouch.clientX;
      touchStartY.current = startTouch.clientY;
      startTime.current = performance.now();
      containerWidth.current = el.clientWidth || 1;
      isDraggingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (startTime.current === 0) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = touch.clientY - touchStartY.current;

      if (!isDraggingRef.current) {
        if (Math.abs(dx) < START_THRESHOLD_PX || Math.abs(dy) > Math.abs(dx) * MAX_VERTICAL_RATIO) return;
        const dir: Direction = dx < 0 ? 'next' : 'prev';
        const targetIdx = activeIndexRef.current + (dir === 'next' ? 1 : -1);
        if (targetIdx < 0 || targetIdx >= tabs.length) return; // no adjacent tab that way
        isDraggingRef.current = true;
        gestureIdRef.current += 1;
        deltaPercentRef.current = 0;
        el.style.setProperty('--tab-swipe-x', '0%');
        setDrag({ active: true, settling: false, direction: dir, deltaPercent: 0 });
      }

      if (isDraggingRef.current) {
        e.preventDefault();
        const pct = (dx / containerWidth.current) * 100;
        const clamped = Math.max(-100, Math.min(100, pct));
        deltaPercentRef.current = clamped;
        el.style.setProperty('--tab-swipe-x', `${clamped}%`);
      }
    };

    const finish = (dxPx: number) => {
      if (!isDraggingRef.current) {
        startTime.current = 0;
        return;
      }
      isDraggingRef.current = false;
      const gestureId = gestureIdRef.current;
      const current = dragRef.current;
      const elapsed = Math.max(performance.now() - startTime.current, 1);
      startTime.current = 0;

      const velocity = Math.abs(dxPx) / elapsed;
      const distancePercent = Math.abs(deltaPercentRef.current);
      const shouldCommit =
        !!current.direction && (distancePercent >= COMMIT_RATIO * 100 || (velocity > FLICK_VELOCITY && distancePercent > 8));

      if (!current.direction) {
        el.style.removeProperty('--tab-swipe-x');
        setDrag(IDLE);
        return;
      }

      if (shouldCommit) {
        const targetIdx = activeIndexRef.current + (current.direction === 'next' ? 1 : -1);
        const targetTab = tabs[targetIdx];
        const commitTo = current.direction === 'next' ? -100 : 100;
        triggerHaptic('light');
        el.style.setProperty('--tab-swipe-x', `${commitTo}%`);
        setDrag({ ...current, settling: true, deltaPercent: commitTo });
        window.setTimeout(() => {
          if (gestureIdRef.current !== gestureId) return;
          onSwipe(targetTab);
          el.style.removeProperty('--tab-swipe-x');
          setDrag(IDLE);
        }, reducedMotion.current ? 0 : SETTLE_MS);
      } else {
        el.style.setProperty('--tab-swipe-x', '0%');
        setDrag({ ...current, settling: true, deltaPercent: 0 });
        window.setTimeout(() => {
          if (gestureIdRef.current !== gestureId) return;
          el.style.removeProperty('--tab-swipe-x');
          setDrag(IDLE);
        }, reducedMotion.current ? 0 : SETTLE_MS);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const dxPx = e.changedTouches[0] ? e.changedTouches[0].clientX - touchStartX.current : 0;
      finish(dxPx);
    };
    const handleTouchCancel = () => finish(0);

    return {
      start: handleTouchStart,
      move: handleTouchMove,
      end: handleTouchEnd,
      cancel: handleTouchCancel,
    };
    });
  }, [host, tabs, onSwipe]);

  return useMemo(() => {
    const isLive = drag.active || drag.settling;
    const transition = !isLive || drag.active || reducedMotion.current ? 'none' : `transform ${SETTLE_MS}ms ${SETTLE_EASE}`;

    const activePaneStyle: CSSProperties = isLive
      ? {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          transform: 'translateX(var(--tab-swipe-x, 0%))',
          transition,
          willChange: 'transform',
        }
      : {};

    const previewTab = isLive && drag.direction
      ? tabs[activeIndexRef.current + (drag.direction === 'next' ? 1 : -1)] ?? null
      : null;

    const previewBase = drag.direction === 'next' ? 100 : -100;
    const previewPaneStyle: CSSProperties = {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      transform: `translateX(calc(${previewBase}% + var(--tab-swipe-x, 0%)))`,
      transition,
      willChange: 'transform',
    };

    return { activePaneStyle, previewTab, previewPaneStyle };
  }, [drag, tabs]);
}
