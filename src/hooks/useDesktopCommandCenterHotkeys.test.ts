import { describe, it, expect, vi } from 'vitest';
import { handleDesktopCommandCenterKeyDown } from './useDesktopCommandCenterHotkeys';

describe('useDesktopCommandCenterHotkeys', () => {
  it('triggers onNewExpense when pressing N while not in an input', () => {
    const onNewExpense = vi.fn();
    handleDesktopCommandCenterKeyDown(
      { key: 'n', preventDefault: vi.fn() },
      {
        enabled: true,
        onNewExpense,
      }
    );
    expect(onNewExpense).toHaveBeenCalledTimes(1);

    handleDesktopCommandCenterKeyDown(
      { key: 'N', preventDefault: vi.fn() },
      {
        enabled: true,
        onNewExpense,
      }
    );
    expect(onNewExpense).toHaveBeenCalledTimes(2);
  });

  it('switches tabs on number keys 1-5', () => {
    const onSelectTab = vi.fn();
    handleDesktopCommandCenterKeyDown(
      { key: '1', preventDefault: vi.fn() },
      {
        enabled: true,
        onSelectTab,
      }
    );
    expect(onSelectTab).toHaveBeenCalledWith('expenses');

    handleDesktopCommandCenterKeyDown(
      { key: '3', preventDefault: vi.fn() },
      {
        enabled: true,
        onSelectTab,
      }
    );
    expect(onSelectTab).toHaveBeenCalledWith('ledger');
  });

  it('triggers onEscape on Escape key', () => {
    const onEscape = vi.fn();
    handleDesktopCommandCenterKeyDown(
      { key: 'Escape', preventDefault: vi.fn() },
      {
        enabled: true,
        onEscape,
      }
    );
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does nothing when enabled is false', () => {
    const onNewExpense = vi.fn();
    handleDesktopCommandCenterKeyDown(
      { key: 'n', preventDefault: vi.fn() },
      {
        enabled: false,
        onNewExpense,
      }
    );
    expect(onNewExpense).not.toHaveBeenCalled();
  });

  it('focuses search when / is pressed', () => {
    const onSearchFocus = vi.fn();
    handleDesktopCommandCenterKeyDown(
      { key: '/', preventDefault: vi.fn() },
      {
        enabled: true,
        onSearchFocus,
      }
    );
    expect(onSearchFocus).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts when modifier keys like ctrlKey or metaKey are held', () => {
    const onNewExpense = vi.fn();
    handleDesktopCommandCenterKeyDown(
      { key: 'n', ctrlKey: true, preventDefault: vi.fn() },
      {
        enabled: true,
        onNewExpense,
      }
    );
    expect(onNewExpense).not.toHaveBeenCalled();
  });
});
