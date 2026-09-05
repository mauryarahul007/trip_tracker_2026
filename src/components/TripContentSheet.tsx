import { useRef, useState, useEffect, type PointerEvent, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Exported so TripMapHero can size its fitBounds padding to match --
// the map needs to fit the whole route above wherever the sheet's top
// edge actually sits, not just this file's own layout.
export const SHEET_COLLAPSED_TOP = 50; // vh% -- initial state, map half visible
const SHEET_EXPANDED_TOP = 20; // vh% -- swiped-up state, 80% coverage
const SHEET_FULL_TOP = 0; // vh% -- fully expanded, Uber-style: covers the map entirely

const SNAP_POINTS = [SHEET_FULL_TOP, SHEET_EXPANDED_TOP, SHEET_COLLAPSED_TOP];
function nearestSnapPoint(value: number): number {
  return SNAP_POINTS.reduce((closest, point) =>
    Math.abs(point - value) < Math.abs(closest - value) ? point : closest
  );
}

// A quick short flick should move one snap step in the flick's direction,
// same as iOS/Android native sheets, instead of always settling on whichever
// point the finger happened to end up closest to. %-of-viewport-height per ms;
// tuned so an ordinary drag (which stays well under this) never triggers it.
const FLING_VELOCITY_THRESHOLD = 0.08;
function resolveSnapPoint(value: number, velocity: number, startTop: number): number {
  if (Math.abs(velocity) >= FLING_VELOCITY_THRESHOLD) {
    const startIdx = SNAP_POINTS.indexOf(nearestSnapPoint(startTop));
    if (velocity < 0 && startIdx > 0) return SNAP_POINTS[startIdx - 1]; // flung up
    if (velocity > 0 && startIdx < SNAP_POINTS.length - 1) return SNAP_POINTS[startIdx + 1]; // flung down
  }
  return nearestSnapPoint(value);
}

function triggerSnapHaptic(): void {
  if (!Capacitor.isNativePlatform()) return;
  void Haptics.impact({ style: ImpactStyle.Light });
}

// Rubber-band resistance past the drag bounds instead of a hard stop --
// dragging beyond top:0 or top:50 still gives a little, damped by RESISTANCE,
// so the extremes feel soft rather than hitting a wall. Snapping back to a
// real point still happens on release via nearestSnapPoint.
const RESISTANCE = 0.35;
function withResistance(value: number): number {
  if (value < SHEET_FULL_TOP) {
    return SHEET_FULL_TOP - (SHEET_FULL_TOP - value) * RESISTANCE;
  }
  if (value > SHEET_COLLAPSED_TOP) {
    return SHEET_COLLAPSED_TOP + (value - SHEET_COLLAPSED_TOP) * RESISTANCE;
  }
  return value;
}

interface Props {
  children: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  // Fired when the sheet snaps fully open (covering the map/header entirely)
  // vs. any other state -- lets the caller hide the floating header, which
  // otherwise always paints above the sheet regardless of how far it's dragged.
  onFullChange?: (full: boolean) => void;
}

// Draggable bottom sheet over the map backdrop. Starts covering half the
// screen; swiping anywhere up on mobile expands it to 80%, snapping to whichever
// state is nearer on release. On desktop, dragging is restricted to the handle.
export function TripContentSheet({ children, onExpandedChange, onFullChange }: Props) {
  const [topPercent, setTopPercent] = useState(SHEET_COLLAPSED_TOP);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);

  const dragStartY = useRef(0);
  const dragStartTop = useRef(SHEET_COLLAPSED_TOP);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const liveTopPercentRef = useRef(SHEET_COLLAPSED_TOP);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);

  // Sync live ref with state
  useEffect(() => {
    liveTopPercentRef.current = topPercent;
  }, [topPercent]);

  const updateTopPercent = (val: number) => {
    liveTopPercentRef.current = val;
    setTopPercent(val);
  };

  const resetVelocityTracking = (startPercent: number) => {
    lastMoveTime.current = performance.now();
    lastMovePercent.current = startPercent;
    velocityRef.current = 0;
  };

  const trackVelocity = (nextPercent: number) => {
    const now = performance.now();
    const dt = now - lastMoveTime.current;
    if (dt > 0) velocityRef.current = (nextPercent - lastMovePercent.current) / dt;
    lastMoveTime.current = now;
    lastMovePercent.current = nextPercent;
  };

  const endDragAndSnap = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const sheetEl = sheetRef.current;
    const scrimEl = scrimRef.current;
    sheetEl?.classList.remove('dragging');
    scrimEl?.classList.remove('dragging');

    const finalTop = resolveSnapPoint(liveTopPercentRef.current, velocityRef.current, dragStartTop.current);
    if (finalTop !== dragStartTop.current) triggerSnapHaptic();

    // Smoothly spring the GPU transform to the target snap point
    const targetDeltaPx = ((finalTop - dragStartTop.current) / 100) * window.innerHeight;
    if (sheetEl) {
      sheetEl.style.transition = 'transform 0.38s var(--ease-uber-spring)';
      sheetEl.style.transform = `translate3d(0, ${targetDeltaPx}px, 0)`;
    }
    if (scrimEl) {
      const finalProgress = Math.max(0, Math.min(1, (SHEET_COLLAPSED_TOP - finalTop) / (SHEET_COLLAPSED_TOP - SHEET_FULL_TOP)));
      scrimEl.style.transition = 'opacity 0.38s var(--ease-uber-spring)';
      scrimEl.style.opacity = `${finalProgress * 0.55}`;
    }

    // Once spring completes, reconcile top property and reset inline styles
    settleTimeoutRef.current = window.setTimeout(() => {
      settleTimeoutRef.current = null;
      if (sheetEl) {
        sheetEl.style.transition = '';
        sheetEl.style.transform = '';
      }
      if (scrimEl) {
        scrimEl.style.transition = '';
        scrimEl.style.opacity = '';
      }
      updateTopPercent(finalTop);
      onExpandedChange?.(finalTop !== SHEET_COLLAPSED_TOP);
      onFullChange?.(finalTop === SHEET_FULL_TOP);
    }, 380);
  };

  // Pointer events for desktop mouse dragging (restricted to the handle)
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return; // Touch events are handled separately via native listeners
    if (e.button !== 0) return;

    if (settleTimeoutRef.current !== null) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    dragStartTop.current = topPercent;
    resetVelocityTracking(topPercent);
    isDraggingRef.current = true;
    sheetRef.current?.classList.add('dragging');
    scrimRef.current?.classList.add('dragging');
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (!isDraggingRef.current) return;

    const deltaPercent = ((e.clientY - dragStartY.current) / window.innerHeight) * 100;
    const next = withResistance(dragStartTop.current + deltaPercent);
    trackVelocity(next);
    liveTopPercentRef.current = next;

    const deltaPx = ((next - dragStartTop.current) / 100) * window.innerHeight;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translate3d(0, ${deltaPx}px, 0)`;
    }
    if (scrimRef.current) {
      const progress = Math.max(0, Math.min(1, (SHEET_COLLAPSED_TOP - next) / (SHEET_COLLAPSED_TOP - SHEET_FULL_TOP)));
      scrimRef.current.style.opacity = `${progress * 0.55}`;
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    endDragAndSnap();
  };

  const handlePointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    handlePointerUp(e);
  };

  // Touch gesture handling for smooth responsive swipe-to-expand/collapse anywhere on mobile
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }

      const touch = e.touches[0];
      touchStartY.current = touch.clientY;
      touchStartX.current = touch.clientX;
      dragStartTop.current = liveTopPercentRef.current;
      resetVelocityTracking(liveTopPercentRef.current);

      const target = e.target as HTMLElement;
      const isHandle = target.closest('.trip-sheet-handle');

      // Fast container lookup without layout-thrashing getComputedStyle calls
      scrollContainerRef.current = target.closest('.tab-pane, [data-scrollable]') as HTMLElement | null;

      if (isHandle) {
        isDraggingRef.current = true;
        sheetRef.current?.classList.add('dragging');
        scrimRef.current?.classList.add('dragging');
      } else {
        isDraggingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dy = touch.clientY - touchStartY.current;
      const dx = touch.clientX - touchStartX.current;

      if (isDraggingRef.current) {
        e.preventDefault(); // Prevent standard browser scroll
        const deltaPercent = (dy / window.innerHeight) * 100;
        const next = withResistance(dragStartTop.current + deltaPercent);
        trackVelocity(next);
        liveTopPercentRef.current = next;

        const deltaPx = ((next - dragStartTop.current) / 100) * window.innerHeight;
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translate3d(0, ${deltaPx}px, 0)`;
        }
        if (scrimRef.current) {
          const progress = Math.max(0, Math.min(1, (SHEET_COLLAPSED_TOP - next) / (SHEET_COLLAPSED_TOP - SHEET_FULL_TOP)));
          scrimRef.current.style.opacity = `${progress * 0.55}`;
        }
        return;
      }

      // Check if vertical gesture exceeds threshold and is vertically dominant
      if (Math.abs(dy) > 5 && Math.abs(dy) > Math.abs(dx)) {
        const isScrollAtTop = !scrollContainerRef.current || scrollContainerRef.current.scrollTop <= 0;
        const currentTop = liveTopPercentRef.current;

        const shouldDrag =
          (currentTop === SHEET_COLLAPSED_TOP && dy < 0) || // Swiping up when collapsed
          (currentTop === SHEET_EXPANDED_TOP && dy < 0 && isScrollAtTop) || // Continue up to full
          (currentTop === SHEET_EXPANDED_TOP && dy > 0 && isScrollAtTop) || // Back down to collapsed
          (currentTop === SHEET_FULL_TOP && dy > 0 && isScrollAtTop); // Back down from full

        if (shouldDrag) {
          isDraggingRef.current = true;
          sheetRef.current?.classList.add('dragging');
          scrimRef.current?.classList.add('dragging');
          e.preventDefault();
          touchStartY.current = touch.clientY; // Reset starting touch Y to avoid jump
          resetVelocityTracking(currentTop);
        }
      }
    };

    const handleTouchEnd = () => {
      endDragAndSnap();
    };

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrimProgress = Math.max(0, Math.min(1, (SHEET_COLLAPSED_TOP - topPercent) / (SHEET_COLLAPSED_TOP - SHEET_FULL_TOP)));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerSnapHaptic();
      const nextTop = topPercent >= SHEET_COLLAPSED_TOP ? SHEET_EXPANDED_TOP : topPercent > SHEET_FULL_TOP ? SHEET_FULL_TOP : SHEET_COLLAPSED_TOP;
      updateTopPercent(nextTop);
      onExpandedChange?.(nextTop !== SHEET_COLLAPSED_TOP);
      onFullChange?.(nextTop === SHEET_FULL_TOP);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      triggerSnapHaptic();
      const nextTop = topPercent <= SHEET_EXPANDED_TOP ? SHEET_FULL_TOP : SHEET_EXPANDED_TOP;
      updateTopPercent(nextTop);
      onExpandedChange?.(true);
      onFullChange?.(nextTop === SHEET_FULL_TOP);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      triggerSnapHaptic();
      const nextTop = topPercent >= SHEET_EXPANDED_TOP ? SHEET_COLLAPSED_TOP : SHEET_EXPANDED_TOP;
      updateTopPercent(nextTop);
      onExpandedChange?.(nextTop !== SHEET_COLLAPSED_TOP);
      onFullChange?.(false);
    }
  };

  return (
    <>
      <div ref={scrimRef} className="trip-sheet-scrim" style={{ opacity: scrimProgress * 0.55 }} />
      <div
        ref={sheetRef}
        role="region"
        aria-label="Trip content sheet"
        className={`trip-sheet${topPercent === SHEET_FULL_TOP ? ' full' : ''}`}
        style={{ top: `${topPercent}%` }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Trip content sheet height control. Press Enter or Arrow Up to expand, Arrow Down to collapse."
          aria-expanded={topPercent !== SHEET_COLLAPSED_TOP}
          className="trip-sheet-handle touch-target-btn"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={handleKeyDown}
        >
          <span className="trip-sheet-handle-bar" aria-hidden="true" />
        </div>
        {children}
      </div>
    </>
  );
}

