import { useRef, useState } from 'react';
import { IconTrash, IconEdit } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { EDGE_ZONE_PX } from '../utils/useTabSwipe';

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
    // Edge-zone starts belong to useTabSwipe's page navigation instead --
    // otherwise this row and the page swipe would both track the same
    // physical touch and fight over it. Keep EDGE_ZONE_PX in sync with
    // useTabSwipe.ts.
    if (e.clientX <= EDGE_ZONE_PX || e.clientX >= window.innerWidth - EDGE_ZONE_PX) return;
    active.current = true;
    startX.current = e.clientX;
    hapticFired.current = false;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const delta = e.clientX - startX.current;
    if (delta < 0 && leftAction) {
      // Elastic rubber banding beyond threshold
      let nextDragX = delta;
      if (Math.abs(delta) > THRESHOLD) {
        const overflow = Math.abs(delta) - THRESHOLD;
        nextDragX = -(THRESHOLD + overflow * 0.45);
      }
      nextDragX = Math.max(nextDragX, -MAX_DRAG);

      if (nextDragX < -THRESHOLD && !hapticFired.current) {
        triggerHaptic('medium');
        hapticFired.current = true;
      } else if (nextDragX >= -THRESHOLD && hapticFired.current) {
        hapticFired.current = false;
      }
      setDragX(nextDragX);
    } else if (delta > 0 && rightAction) {
      // Elastic rubber banding beyond threshold
      let nextDragX = delta;
      if (delta > THRESHOLD) {
        const overflow = delta - THRESHOLD;
        nextDragX = THRESHOLD + overflow * 0.45;
      }
      nextDragX = Math.min(nextDragX, MAX_DRAG);

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
  const isLeftTriggered = dragX < -THRESHOLD;
  const isRightTriggered = dragX > THRESHOLD;

  return (
    // data-no-tab-swipe="row": this row already owns horizontal touch drags
    // for its own delete/edit reveal — a page-level swipe-between-tabs
    // gesture must not also see this drag except near the screen edge,
    // where useTabSwipe still arms tab navigation (see EDGE_ZONE_PX there).
    <div data-no-tab-swipe="row" style={{ position: 'relative', overflow: 'hidden' }}>
      {leftAction && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: '8px', paddingRight: '22px',
            background: leftIsDelete ? 'var(--color-danger)' : 'var(--color-success)',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            opacity: dragX < 0 ? Math.min(Math.abs(dragX) / THRESHOLD, 1) : 0,
            transform: `scale(${isLeftTriggered ? 1.05 : 1})`,
            transition: 'transform 0.18s var(--ease-uber-spring)',
          }}
        >
          <span style={{ transform: `scale(${isLeftTriggered ? 1.2 : 1})`, transition: 'transform 0.18s var(--ease-uber-spring)', display: 'inline-flex' }}>
            {leftIsDelete ? <IconTrash size={15} className="icon-sm" /> : <IconEdit size={15} className="icon-sm" />}
          </span>
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
            transform: `scale(${isRightTriggered ? 1.05 : 1})`,
            transition: 'transform 0.18s var(--ease-uber-spring)',
          }}
        >
          <span style={{ transform: `scale(${isRightTriggered ? 1.2 : 1})`, transition: 'transform 0.18s var(--ease-uber-spring)', display: 'inline-flex' }}>
            {rightIsDelete ? <IconTrash size={15} className="icon-sm" /> : <IconEdit size={15} className="icon-sm" />}
          </span>
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
          transition: dragging || prefersReducedMotion ? 'none' : 'transform 0.32s var(--ease-uber-spring)',
          background: 'var(--bg-surface)',
          touchAction: 'pan-y',
          willChange: dragging ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
