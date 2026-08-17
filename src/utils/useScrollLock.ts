import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Restores original overflow style upon close or unmount.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    // iOS Safari can still rubber-band the page via <html> even with the
    // body locked, so lock both. touch-action:none is deliberately NOT
    // used here — it also suppresses the OS/browser edge swipe-back
    // gesture, which must keep working while a modal is open.
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [locked]);
}
