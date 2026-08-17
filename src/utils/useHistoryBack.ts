import { useEffect, useRef } from 'react';

/**
 * Makes an open/close UI state (modal, sub-screen, form) respond to the
 * browser/OS back action: swipe-back gesture, hardware back button, and
 * the browser Back button. Push a history entry while `isOpen`, and pop it
 * again once the caller closes it through any other means (X button, Esc,
 * outside click) so the entry never lingers.
 *
 * `onClose` only fires from an actual back navigation (popstate) — the
 * caller's own close handler already runs for every other close path.
 *
 * One back action must close exactly one thing, deepest first, even when
 * several screens/modals are open at once. A `popstate` event is global —
 * every mounted instance would see the same event — so a single shared
 * stack + one listener decides which instance it belongs to (whichever
 * pushed last), instead of every open instance reacting to it.
 */
type StackEntry = { onClose: () => void };
const stack: StackEntry[] = [];
let listenerAttached = false;

function handlePopState() {
  const entry = stack.pop();
  entry?.onClose();
}

function ensureListener() {
  if (listenerAttached) return;
  window.addEventListener('popstate', handlePopState);
  listenerAttached = true;
}

export function useHistoryBack(isOpen: boolean, onClose: () => void) {
  const entryRef = useRef<StackEntry | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    ensureListener();
    if (isOpen && !entryRef.current) {
      const entry: StackEntry = { onClose: () => onCloseRef.current() };
      entryRef.current = entry;
      stack.push(entry);
      window.history.pushState({ backStack: true }, '');
    } else if (!isOpen && entryRef.current) {
      entryRef.current = null;
      // Triggers popstate -> handlePopState pops this entry off the stack
      // and calls its onClose, which is a no-op since we're already closed.
      window.history.back();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (!entryRef.current) return;
      const idx = stack.indexOf(entryRef.current);
      if (idx !== -1) stack.splice(idx, 1);
      entryRef.current = null;
    };
  }, []);
}
