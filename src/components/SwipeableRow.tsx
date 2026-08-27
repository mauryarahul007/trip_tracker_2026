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
  // Swaps which physical drag direction fires which action -- default is
  // left = delete, right = edit; reversed is right = delete, left = edit.
  reversed?: boolean;
  // Short "Delete"/"Edit" label instead of the full "Release to..." phrasing.
  plain?: boolean;
};

// Touch-only swipe: left to delete (when onDelete is given), right to edit
// (when onEdit is given) -- or the other way around with `reversed`. Gated
// to pointerType 'touch' so mouse/keyboard users are unaffected — they get
// the same actions via some other explicit control instead.
export function SwipeableRow({ onDelete, onEdit, children, reversed = false, plain = false }: Props) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const startX = useRef(0);
  const hapticFired = useRef(false);

  // The action a leftward drag fires, and the action a rightward drag
  // fires -- swapped from the default when `reversed` is set.
  const leftAction = reversed ? onEdit : onDelete;
  const rightAction = reversed ? onDelete : onEdit;

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
    if (delta < 0 && leftAction) {
      const nextDragX = Math.max(delta, -MAX_DRAG);
      if (nextDragX < -THRESHOLD && !hapticFired.current) {
        triggerHaptic('medium');
        hapticFired.current = true;
      } else if (nextDragX >= -THRESHOLD && hapticFired.current) {
        hapticFired.current = false;
      }
      setDragX(nextDragX);
    } else if (delta > 0 && rightAction) {
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
    if (dragX < -THRESHOLD && leftAction) {
      triggerHaptic(leftAction === onDelete ? 'warning' : 'light');
      leftAction();
    } else if (dragX > THRESHOLD && rightAction) {
      triggerHaptic(rightAction === onDelete ? 'warning' : 'light');
      rightAction();
    }
    setDragX(0);
  };

  const leftIsDelete = leftAction === onDelete;
  const rightIsDelete = rightAction === onDelete;

  return (
    // data-no-tab-swipe: this row already owns horizontal touch drags for
    // its own delete/edit reveal — a page-level swipe-between-tabs gesture
    // must not also see this drag, or the two fight over the same gesture.
    <div data-no-tab-swipe="true" style={{ position: 'relative', overflow: 'hidden' }}>
      {leftAction && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: '8px', paddingRight: '22px',
            background: leftIsDelete ? 'var(--color-danger)' : 'var(--color-success)',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            opacity: dragX < 0 ? Math.min(Math.abs(dragX) / THRESHOLD, 1) : 0,
          }}
        >
          {leftIsDelete ? <IconTrash size={15} className="icon-sm" /> : <IconEdit size={15} className="icon-sm" />}
          {plain
            ? (leftIsDelete ? 'Delete' : 'Edit')
            : (leftIsDelete ? 'Release to delete' : 'Release to edit')}
        </div>
      )}
      {rightAction && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            gap: '8px', paddingLeft: '22px',
            background: rightIsDelete ? 'var(--color-danger)' : 'var(--color-success)',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            opacity: dragX > 0 ? Math.min(dragX / THRESHOLD, 1) : 0,
          }}
        >
          {rightIsDelete ? <IconTrash size={15} className="icon-sm" /> : <IconEdit size={15} className="icon-sm" />}
          {plain
            ? (rightIsDelete ? 'Delete' : 'Edit')
            : (rightIsDelete ? 'Release to delete' : 'Release to edit')}
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
