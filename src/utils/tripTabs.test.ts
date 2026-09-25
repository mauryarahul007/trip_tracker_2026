import { describe, expect, it } from 'vitest';
import { showNotesNavTab, visibleTripTabs } from './tripTabs';

describe('visible trip tabs', () => {
  it('matches the bottom bar: summary, expenses, members, then notes', () => {
    expect(visibleTripTabs({ isChatFirstNav: false, showNotesTab: true })).toEqual([
      'expenses', 'ledger', 'members', 'notes',
    ]);
  });

  it('puts chat first when that nav is on, and omits notes when the bar does', () => {
    expect(visibleTripTabs({ isChatFirstNav: true, showNotesTab: false })).toEqual([
      'chat', 'expenses', 'ledger', 'members',
    ]);
  });

  it('keeps a notes tab when chat needs a home and chat-first nav is off', () => {
    expect(showNotesNavTab({
      isNotesEnabled: false,
      isPassesEnabled: false,
      isTripChatEnabled: true,
      isChatFirstNav: false,
    })).toBe(true);
    expect(showNotesNavTab({
      isNotesEnabled: false,
      isPassesEnabled: false,
      isTripChatEnabled: true,
      isChatFirstNav: true,
    })).toBe(false);
  });
});
