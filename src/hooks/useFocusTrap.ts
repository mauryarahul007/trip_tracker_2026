import { useEffect, type RefObject } from 'react';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean = true,
  skipAutoFocus: boolean = false,
  onEscape?: () => void
) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    // Save previous focused element to return focus when closed
    const originalFocus = document.activeElement as HTMLElement | null;

    // Selector for all standard focusable HTML elements
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Helper to get focusable elements list
    const getFocusableElements = () => {
      return Array.from(el.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((node) => {
          const style = window.getComputedStyle(node);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            !(node as HTMLButtonElement).disabled
          );
        });
    };

    let autoFocusTimer: ReturnType<typeof setTimeout> | null = null;
    if (!skipAutoFocus) {
      autoFocusTimer = setTimeout(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else if (el.tabIndex >= 0 || el.getAttribute('tabindex') !== null) {
          el.focus();
        }
      }, 50);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstEl || !el.contains(document.activeElement)) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastEl || !el.contains(document.activeElement)) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    // Listen on document or container to catch Tab presses reliably
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      if (autoFocusTimer) clearTimeout(autoFocusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to original active element
      if (originalFocus && typeof originalFocus.focus === 'function' && document.body.contains(originalFocus)) {
        try {
          originalFocus.focus();
        } catch {}
      }
    };
  }, [ref, active, skipAutoFocus, onEscape]);
}

