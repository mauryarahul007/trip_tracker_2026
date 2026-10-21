/// Navigation tabs available within a trip context.
/// [hub] is the Compass "Trip" tab (People, Notes, Receipts, Insights, Settings); legacy nav never lists it.
enum TripNavTab { chat, expenses, ledger, members, notes, hub }

/// Evaluates whether the Notes navigation tab should appear on the bottom bar.
/// Mirrors `showNotesNavTab` in `src/utils/tripTabs.ts`.
bool showNotesNavTab({
  required bool isNotesEnabled,
  required bool isPassesEnabled,
  required bool isTripChatEnabled,
  required bool isChatFirstNav,
}) {
  return isNotesEnabled || isPassesEnabled || (isTripChatEnabled && !isChatFirstNav);
}

/// Computes the active bottom-nav tabs and ordering for a trip.
/// Settings is accessed from the trip header and is not in the bottom tab bar.
/// Based on `visibleTripTabs` in `src/utils/tripTabs.ts`, except that the Flutter app puts Summary (the
/// `ledger` tab) first and Expenses second, so a trip opens on who owes what.
List<TripNavTab> visibleTripTabs({required bool isChatFirstNav, required bool showNotesTab}) {
  final tabs = <TripNavTab>[];
  if (isChatFirstNav) {
    tabs.add(TripNavTab.chat);
  }
  tabs.addAll([TripNavTab.ledger, TripNavTab.expenses, TripNavTab.members]);
  if (showNotesTab) {
    tabs.add(TripNavTab.notes);
  }
  return List.unmodifiable(tabs);
}

/// Compass trip dock (flag `enableCompassNav`): Spend, Balances, Chat (when chat is on), Trip. The centre
/// "+" button is added by the dock itself.
List<TripNavTab> compassDockTabs({required bool chatEnabled}) =>
    List.unmodifiable([TripNavTab.expenses, TripNavTab.ledger, if (chatEnabled) TripNavTab.chat, TripNavTab.hub]);

/// Every page the Compass trip pager can show, in swipe order: the dock tabs, then the two tabs that live
/// under Trip (People, Notes) so their links and notifications keep working.
List<TripNavTab> compassPagerTabs({required bool chatEnabled, required bool showNotesTab}) => List.unmodifiable([
  ...compassDockTabs(chatEnabled: chatEnabled),
  TripNavTab.members,
  if (showNotesTab) TripNavTab.notes,
]);

/// The dock item that lights up for [current]: People and Notes belong to the Trip hub.
TripNavTab compassDockTabFor(TripNavTab current) =>
    current == TripNavTab.members || current == TripNavTab.notes ? TripNavTab.hub : current;
