import { useRef, useState } from 'react';
import { IconTrash } from './Icons';

const THRESHOLD = 84;
const MAX_DRAG = 120;

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Props = {
  onDelete: () => void;
  children: React.ReactNode;
};

// Touch-only swipe-left-to-delete. Gated to pointerType 'touch' so mouse and
// keyboard interaction (and the always-visible trash button) are unaffected —
// this is a supplement, not a replacement, for the explicit delete control.
export function SwipeableRow({ onDelete, children }: Props) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const startX = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    active.current = true;
    startX.current = e.clientX;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const delta = e.clientX - startX.current;
    if (delta < 0) setDragX(Math.max(delta, -MAX_DRAG));
  };

  const endDrag = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    if (dragX < -THRESHOLD) onDelete();
    setDragX(0);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: '8px', paddingRight: '22px', background: 'var(--color-danger)', color: '#fff',
          fontSize: '13px', fontWeight: 600,
          opacity: Math.min(Math.abs(dragX) / THRESHOLD, 1),
        }}
      >
        <IconTrash size={15} className="icon-sm" /> Release to delete
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging || prefersReducedMotion ? 'none' : 'transform 0.25s ease',
          background: 'var(--bg-surface)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
}
