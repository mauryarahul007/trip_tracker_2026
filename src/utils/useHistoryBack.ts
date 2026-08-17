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
 */
export function useHistoryBack(isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen && !pushedRef.current) {
      pushedRef.current = true;
      window.history.pushState({ backStack: true }, '');
    } else if (!isOpen && pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onCloseRef.current();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}
