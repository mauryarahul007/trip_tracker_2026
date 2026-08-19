import { useEffect } from 'react';

/** Closes an open modal/dialog/sub-screen on the Escape key — the desktop
 * equivalent of useHistoryBack's swipe/back-gesture handling for mobile. */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
