import { useRef, useState, useEffect, type PointerEvent, type ReactNode } from 'react';

const SHEET_COLLAPSED_TOP = 50; // vh% -- initial state, map half visible
const SHEET_EXPANDED_TOP = 20; // vh% -- swiped-up state, 80% coverage

interface Props {
  children: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
}

// Draggable bottom sheet over the map backdrop. Starts covering half the
// screen; swiping anywhere up on mobile expands it to 80%, snapping to whichever
// state is nearer on release. On desktop, dragging is restricted to the handle.
export function TripContentSheet({ children, onExpandedChange }: Props) {
  const [topPercent, setTopPercent] = useState(SHEET_COLLAPSED_TOP);
  const [isDragging, setIsDragging] = useState(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);

  const dragStartY = useRef(0);
  const dragStartTop = useRef(SHEET_COLLAPSED_TOP);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const liveTopPercentRef = useRef(SHEET_COLLAPSED_TOP);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Sync live ref with state
  useEffect(() => {
    liveTopPercentRef.current = topPercent;
  }, [topPercent]);

  const updateTopPercent = (val: number) => {
    liveTopPercentRef.current = val;
    setTopPercent(val);
  };

  // Pointer events for desktop mouse dragging (restricted to the handle)
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return; // Touch events are handled separately via native listeners
    if (e.button !== 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    dragStartTop.current = topPercent;
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (!isDragging) return;

    const deltaPercent = ((e.clientY - dragStartY.current) / window.innerHeight) * 100;
    const next = Math.min(SHEET_COLLAPSED_TOP, Math.max(SHEET_EXPANDED_TOP, dragStartTop.current + deltaPercent));
    updateTopPercent(next);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (!isDragging) return;

    setIsDragging(false);
    const midpoint = (SHEET_COLLAPSED_TOP + SHEET_EXPANDED_TOP) / 2;
    const expanded = liveTopPercentRef.current < midpoint;
    const finalTop = expanded ? SHEET_EXPANDED_TOP : SHEET_COLLAPSED_TOP;
    updateTopPercent(finalTop);
    onExpandedChange?.(expanded);
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
      const touch = e.touches[0];
      touchStartY.current = touch.clientY;
      touchStartX.current = touch.clientX;
      dragStartTop.current = liveTopPercentRef.current;

      const target = e.target as HTMLElement;
      const isHandle = target.closest('.trip-sheet-handle');

      // Find closest scrollable element in hierarchy
      let scrollEl: HTMLElement | null = target;
      while (scrollEl && scrollEl !== el) {
        const style = window.getComputedStyle(scrollEl);
        const overflow = style.overflowY || style.overflow;
        if ((overflow.includes('auto') || overflow.includes('scroll')) && scrollEl.scrollHeight > scrollEl.clientHeight) {
          break;
        }
        scrollEl = scrollEl.parentElement;
      }
      scrollContainerRef.current = scrollEl === el ? null : scrollEl;

      if (isHandle) {
        isDraggingRef.current = true;
        setIsDragging(true);
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
        const next = Math.min(SHEET_COLLAPSED_TOP, Math.max(SHEET_EXPANDED_TOP, dragStartTop.current + deltaPercent));
        updateTopPercent(next);
        return;
      }

      // Check if vertical gesture exceeds threshold and is vertically dominant
      if (Math.abs(dy) > 5 && Math.abs(dy) > Math.abs(dx)) {
        const isScrollAtTop = !scrollContainerRef.current || scrollContainerRef.current.scrollTop <= 0;
        const currentTop = liveTopPercentRef.current;

        const shouldDrag =
          (currentTop === SHEET_COLLAPSED_TOP && dy < 0) || // Swiping up when collapsed
          (currentTop === SHEET_EXPANDED_TOP && dy > 0 && isScrollAtTop); // Swiping down when expanded and content scrolled to top

        if (shouldDrag) {
          isDraggingRef.current = true;
          setIsDragging(true);
          e.preventDefault();
          touchStartY.current = touch.clientY; // Reset starting touch Y to avoid jump
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const currentTop = liveTopPercentRef.current;
      const midpoint = (SHEET_COLLAPSED_TOP + SHEET_EXPANDED_TOP) / 2;
      const expanded = currentTop < midpoint;
      const finalTop = expanded ? SHEET_EXPANDED_TOP : SHEET_COLLAPSED_TOP;
      updateTopPercent(finalTop);
      onExpandedChange?.(expanded);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={sheetRef}
      className={`trip-sheet${isDragging ? ' dragging' : ''}`}
      style={{ top: `${topPercent}%` }}
    >
      <div
        className="trip-sheet-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <span className="trip-sheet-handle-bar" />
      </div>
      {children}
    </div>
  );
}
