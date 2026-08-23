import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

const SHEET_COLLAPSED_TOP = 50; // vh% -- initial state, map half visible
const SHEET_EXPANDED_TOP = 20; // vh% -- swiped-up state, 80% coverage

interface Props {
  children: ReactNode;
}

// Draggable bottom sheet over the map backdrop. Starts covering half the
// screen; swiping the handle up expands it to 80%, snapping to whichever
// state is nearer on release.
export function TripContentSheet({ children }: Props) {
  const [topPercent, setTopPercent] = useState(SHEET_COLLAPSED_TOP);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartTop = useRef(SHEET_COLLAPSED_TOP);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    dragStartTop.current = topPercent;
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaPercent = ((e.clientY - dragStartY.current) / window.innerHeight) * 100;
    const next = Math.min(SHEET_COLLAPSED_TOP, Math.max(SHEET_EXPANDED_TOP, dragStartTop.current + deltaPercent));
    setTopPercent(next);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const midpoint = (SHEET_COLLAPSED_TOP + SHEET_EXPANDED_TOP) / 2;
    setTopPercent(topPercent < midpoint ? SHEET_EXPANDED_TOP : SHEET_COLLAPSED_TOP);
  };

  return (
    <div className={`trip-sheet${isDragging ? ' dragging' : ''}`} style={{ top: `${topPercent}%` }}>
      <div
        className="trip-sheet-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="trip-sheet-handle-bar" />
      </div>
      {children}
    </div>
  );
}
