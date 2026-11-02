import { useEffect } from 'react';

export type CommandTab = 'expenses' | 'members' | 'ledger' | 'notes' | 'chat';

export type DesktopHotkeysOptions = {
  enabled: boolean;
  onNewExpense?: () => void;
  onSelectTab?: (tabKey: CommandTab) => void;
  onEscape?: () => void;
  onSearchFocus?: () => void;
};

export type KeyboardEventLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  preventDefault?: () => void;
};

export function handleDesktopCommandCenterKeyDown(
  e: KeyboardEvent | KeyboardEventLike,
  options: DesktopHotkeysOptions
) {
  if (!options.enabled) return;

  const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
  const isInput =
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.isContentEditable);

  // Handle Escape even if inside an input to blur/close
  if (e.key === 'Escape') {
    if (isInput) {
      activeEl.blur();
    }
    options.onEscape?.();
    return;
  }

  // Ignore all other shortcuts if typing inside an editable field
  if (isInput) return;

  // Check modifier keys (don't trigger on Ctrl+C, Cmd+N, etc.)
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // 1. Slash '/' focuses the search box
  if (e.key === '/') {
    e.preventDefault?.();
    if (options.onSearchFocus) {
      options.onSearchFocus();
    } else if (typeof document !== 'undefined') {
      const searchInput = document.querySelector<HTMLInputElement>('.expense-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    return;
  }

  // 2. 'n' or 'N' triggers new bill
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault?.();
    options.onNewExpense?.();
    return;
  }

  // 3. Tab keys '1' to '5'
  if (['1', '2', '3', '4', '5'].includes(e.key)) {
    const tabs: CommandTab[] = ['expenses', 'members', 'ledger', 'notes', 'chat'];
    const index = parseInt(e.key, 10) - 1;
    const targetTab = tabs[index];
    if (targetTab) {
      e.preventDefault?.();
      options.onSelectTab?.(targetTab);
    }
    return;
  }

  // 4. 'j' / 'k' row navigation
  if ((e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') && typeof document !== 'undefined') {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-expense-row]'));
    if (rows.length === 0) return;

    const currentIndex = activeEl ? rows.indexOf(activeEl) : -1;
    let nextIndex = currentIndex;

    if (e.key === 'j' || e.key === 'J') {
      nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
    }

    e.preventDefault?.();
    rows[nextIndex]?.focus();
  }
}

export function useDesktopCommandCenterHotkeys(options: DesktopHotkeysOptions) {
  useEffect(() => {
    if (!options.enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => handleDesktopCommandCenterKeyDown(e, options);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options.enabled, options.onNewExpense, options.onSelectTab, options.onEscape, options.onSearchFocus]);
}
