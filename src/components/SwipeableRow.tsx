import { useRef, useState } from 'react';
import { IconTrash, IconEdit } from './Icons';
import { triggerHaptic } from '../utils/haptics';

const THRESHOLD = 84;
const MAX_DRAG = 120;

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Props = {
  onDelete?: () => void;
  onEdit?: () => void;
  children: React.ReactNode;
};

// Touch-only swipe: left to delete (when onDelete is given), right to edit
// (when onEdit is given). Gated to pointerType 'touch' so mouse/keyboard
// users are unaffected — they get the same actions via some other explicit
// control instead.
export function SwipeableRow({ onDelete, onEdit, children }: Props) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const startX = useRef(0);
  const hapticFired = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    active.current = true;
    startX.current = e.clientX;
    hapticFired.current = false;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const delta = e.clientX - startX.current;
    if (delta < 0 && onDelete) {
      const nextDragX = Math.max(delta, -MAX_DRAG);
      if (nextDragX < -THRESHOLD && !hapticFired.current) {
        triggerHaptic('medium');
        hapticFired.current = true;
      } else if (nextDragX >= -THRESHOLD && hapticFired.current) {
        hapticFired.current = false;
      }
      setDragX(nextDragX);
    } else if (delta > 0 && onEdit) {
      const nextDragX = Math.min(delta, MAX_DRAG);
      if (nextDragX > THRESHOLD && !hapticFired.current) {
        triggerHaptic('medium');
        hapticFired.current = true;
      } else if (nextDragX <= THRESHOLD && hapticFired.current) {
        hapticFired.current = false;
      }
      setDragX(nextDragX);
    }
  };

  const endDrag = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    if (dragX < -THRESHOLD && onDelete) {
      triggerHaptic('warning');
      onDelete();
    } else if (dragX > THRESHOLD && onEdit) {
      triggerHaptic('light');
      onEdit();
    }
    setDragX(0);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {onDelete && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: '8px', paddingRight: '22px', background: 'var(--color-danger)', color: '#fff',
            fontSize: '13px', fontWeight: 600,
            opacity: dragX < 0 ? Math.min(Math.abs(dragX) / THRESHOLD, 1) : 0,
          }}
        >
          <IconTrash size={15} className="icon-sm" /> Release to delete
        </div>
      )}
      {onEdit && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            gap: '8px', paddingLeft: '22px', background: 'var(--primary-accent)', color: '#fff',
            fontSize: '13px', fontWeight: 600,
            opacity: dragX > 0 ? Math.min(dragX / THRESHOLD, 1) : 0,
          }}
        >
          <IconEdit size={15} className="icon-sm" /> Release to edit
        </div>
      )}
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
