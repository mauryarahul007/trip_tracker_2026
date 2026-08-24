import { useEffect, type RefObject } from 'react';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean = true,
  skipAutoFocus: boolean = false
) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    // Selector for all standard focusable HTML elements
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Helper to get focusable elements list
    const getFocusableElements = () => {
      return Array.from(el.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((node) => {
          // Filter out elements that are hidden or disabled
          const style = window.getComputedStyle(node);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            !(node as HTMLButtonElement).disabled
          );
        });
    };

    const focusable = getFocusableElements();
    const originalFocus = document.activeElement as HTMLElement | null;

    if (!skipAutoFocus && focusable.length > 0) {
      // Small timeout to let rendering finish and avoid focus fighting
      const timer = setTimeout(() => {
        focusable[0].focus();
      }, 50);
      return () => clearTimeout(timer);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
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
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown);

    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      // Restore focus to original active element
      if (originalFocus && typeof originalFocus.focus === 'function') {
        originalFocus.focus();
      }
    };
  }, [ref, active, skipAutoFocus]);
}
