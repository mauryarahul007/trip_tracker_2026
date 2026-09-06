import { useEffect, useRef } from 'react';

/**
 * Escape closes only the topmost registered overlay — same LIFO order as
 * useHistoryBack. Without a stack, every open useEscapeKey listener would
 * fire on one keypress and peel multiple layers at once.
 */
type EscapeEntry = { onClose: () => void };
const escapeStack: EscapeEntry[] = [];

/** Closes an open modal/dialog/sub-screen on the Escape key — the desktop
 * equivalent of useHistoryBack's swipe/back-gesture handling for mobile. */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  const entryRef = useRef<EscapeEntry | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen && !entryRef.current) {
      const entry: EscapeEntry = { onClose: () => onCloseRef.current() };
      entryRef.current = entry;
      escapeStack.push(entry);
    } else if (!isOpen && entryRef.current) {
      const idx = escapeStack.indexOf(entryRef.current);
      entryRef.current = null;
      if (idx !== -1) escapeStack.splice(idx, 1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const top = escapeStack[escapeStack.length - 1];
      if (!top || top !== entryRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      top.onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (!entryRef.current) return;
      const idx = escapeStack.indexOf(entryRef.current);
      if (idx !== -1) escapeStack.splice(idx, 1);
      entryRef.current = null;
    };
  }, []);
}
