export type TripNavTab = 'chat' | 'expenses' | 'ledger' | 'members' | 'notes';

/** Notes is on the bar when Notes or Passes is on, and also when trip chat
 * needs a home (chat-first nav off). Swipe and the bar must use this same rule. */
export function showNotesNavTab(input: {
  isNotesEnabled: boolean;
  isPassesEnabled: boolean;
  isTripChatEnabled: boolean;
  isChatFirstNav: boolean;
}): boolean {
  return input.isNotesEnabled || input.isPassesEnabled || (input.isTripChatEnabled && !input.isChatFirstNav);
}

/** Bottom-nav order. Settings is opened from the header and is not included. */
export function visibleTripTabs(input: {
  isChatFirstNav: boolean;
  showNotesTab: boolean;
}): readonly TripNavTab[] {
  const tabs: TripNavTab[] = [];
  if (input.isChatFirstNav) tabs.push('chat');
  tabs.push('expenses', 'ledger', 'members');
  if (input.showNotesTab) tabs.push('notes');
  return tabs;
}
