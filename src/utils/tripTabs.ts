export type TripNavTab = 'chat' | 'expenses' | 'ledger' | 'members' | 'notes' | 'hub' | 'activity';

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

/** Calm Passport trip dock (flag `enableCalmPassportUi`): Balances, Spend, Activity, Chat, Hub.
 * Plans (Notes) opens from the Hub and People from the header; Chat drops out when trip chat is
 * off. Mirrors `calmDockTabs` in
 * flutter_app/lib/features/trip_details/domain/trip_tabs.dart. */
export function calmDockTabs(input: { chatEnabled: boolean }): readonly TripNavTab[] {
  const tabs: TripNavTab[] = ['ledger', 'expenses', 'activity'];
  if (input.chatEnabled) tabs.push('chat');
  tabs.push('hub');
  return tabs;
}

/** The dock item that lights up for `current`: Members and Notes belong to the Hub. */
export function calmDockTabFor(current: TripNavTab): TripNavTab {
  return current === 'members' || current === 'notes' ? 'hub' : current;
}
