import { useRef } from 'react';
import type React from 'react';
import { triggerHaptic } from '../utils/haptics';

const DISMISS_PX = 70;
const SNAP_BACK = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';

// Pull-down-to-dismiss for bottom sheets: spread the returned handlers on the
// sheet element and attach `ref` to it. Drags that start on `ignoreSelector`
// (buttons, lists that scroll) are left alone.
export function useDragToDismiss<T extends HTMLElement>(
  onDismiss: () => void,
  { enabled = true, ignoreSelector = 'button, a, input, textarea, select, [role="menuitem"]' } = {},
) {
  const ref = useRef<T>(null);
  const startY = useRef<number | null>(null);
  const offset = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || (e.target as HTMLElement).closest(ignoreSelector)) return;
    startY.current = e.clientY;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null || !ref.current) return;
    const diff = e.clientY - startY.current;
    if (diff <= 8) return;
    offset.current = diff - 8;
    ref.current.style.transition = 'none';
    ref.current.style.transform = `translateY(${offset.current}px)`;
  };

  const onPointerUp = () => {
    if (startY.current === null) return;
    const dismiss = offset.current > DISMISS_PX;
    startY.current = null;
    offset.current = 0;
    if (dismiss) {
      // Leave the sheet where the finger let go: the exit animation
      // (ghostExit) clones it mid-drag and carries on from there.
      triggerHaptic('light');
      onDismiss();
      return;
    }
    if (ref.current) {
      ref.current.style.transition = SNAP_BACK;
      ref.current.style.transform = '';
    }
  };

  return {
    ref,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
