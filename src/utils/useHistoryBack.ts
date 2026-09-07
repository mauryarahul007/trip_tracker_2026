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
 * Two things mobile browsers need, that a plain `pushState(state, '')`
 * doesn't give them:
 *
 * 1. A real, visibly different URL. Repeated same-URL pushState calls
 *    (the empty-string url form) are exactly the pattern mobile Chrome's
 *    history-manipulation heuristics treat as noise and can collapse or
 *    skip entirely on a back gesture — so it silently fails to close
 *    anything, or closes more than one thing at once. Pushing a real hash
 *    fragment per open screen/modal gives the browser a genuine URL change
 *    to track, so the gesture reliably lands on our entry.
 *
 * 2. Self-correction if a gesture still skips more than one entry at once
 *    (a long/fast swipe can do this on some browsers regardless). Each
 *    pushed state carries its own stack depth; on popstate we close
 *    everything deeper than where the browser actually landed, instead of
 *    assuming exactly one entry was consumed.
 */
type StackEntry = { onClose: () => void };
const stack: StackEntry[] = [];
let listenerAttached = false;

function handlePopState(event: PopStateEvent) {
  const state = event.state as { navDepth?: number } | null;
  const targetDepth = typeof state?.navDepth === 'number' ? state.navDepth : 0;
  while (stack.length > targetDepth) {
    const entry = stack.pop();
    entry?.onClose();
  }
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
      const depth = stack.length;
      const baseUrl = window.location.pathname + window.location.search;
      window.history.pushState({ navDepth: depth }, '', `${baseUrl}#nav-${depth}`);
    } else if (!isOpen && entryRef.current) {
      const idx = stack.indexOf(entryRef.current);
      entryRef.current = null;
      if (idx !== -1) {
        stack.length = idx;
        window.history.back();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (!entryRef.current) return;
      const idx = stack.indexOf(entryRef.current);
      if (idx !== -1) stack.length = idx;
      entryRef.current = null;
    };
  }, []);
}

/**
 * For views that maintain a multi-level stack (such as SettingsView's
 * screenStack: [] -> ['about'] -> ['about', 'privacy']).
 *
 * Pushes a history entry for each depth level > 0, so the browser back button
 * or back gesture pops one level at a time back to the previous screen.
 * When popped via UI (in-app back button), steps back the browser history
 * cleanly without duplicate popstate triggers.
 */
export function useHistoryStack(depth: number, onPop: () => void) {
  const entriesRef = useRef<StackEntry[]>([]);
  const onPopRef = useRef(onPop);
  onPopRef.current = onPop;

  useEffect(() => {
    ensureListener();
    const currentEntries = entriesRef.current;

    if (depth > currentEntries.length) {
      // User navigated deeper: push a history state for each newly added depth level
      while (currentEntries.length < depth) {
        const entry: StackEntry = { onClose: () => onPopRef.current() };
        currentEntries.push(entry);
        stack.push(entry);
        const navDepth = stack.length;
        const baseUrl = window.location.pathname + window.location.search;
        window.history.pushState({ navDepth }, '', `${baseUrl}#nav-${navDepth}`);
      }
    } else if (depth < currentEntries.length) {
      // Depth decreased: remove entries from our tracked list
      const toRemove = currentEntries.length - depth;
      let historyStepsBack = 0;

      for (let i = 0; i < toRemove; i++) {
        const entry = currentEntries.pop();
        if (entry) {
          const idx = stack.indexOf(entry);
          if (idx !== -1) {
            // Closed programmatically (e.g. in-app back button), not via popstate
            stack.splice(idx, 1);
            historyStepsBack++;
          }
        }
      }

      if (historyStepsBack > 0) {
        if (historyStepsBack === 1) {
          window.history.back();
        } else {
          window.history.go(-historyStepsBack);
        }
      }
    }
  }, [depth]);

  useEffect(() => {
    return () => {
      const currentEntries = entriesRef.current;
      while (currentEntries.length > 0) {
        const entry = currentEntries.pop();
        if (entry) {
          const idx = stack.indexOf(entry);
          if (idx !== -1) {
            stack.splice(idx, 1);
          }
        }
      }
    };
  }, []);
}

