/// Navigation tabs available within a trip context.
/// [hub] is the Compass "Trip" tab (People, Notes, Receipts, Insights, Settings); legacy nav never lists it.
enum TripNavTab { chat, expenses, ledger, members, notes, hub, activity }

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

/// Compass trip dock (flag `enableCompassNav`): Balances, Spend, Activity, Trip. The centre "+" button is added
/// by the dock itself. Chat lives under Trip, so it is not repeated here.
List<TripNavTab> compassDockTabs() =>
    List.unmodifiable([TripNavTab.ledger, TripNavTab.expenses, TripNavTab.activity, TripNavTab.hub]);

/// Every page the Compass trip pager can show, in swipe order: the dock tabs, then the two tabs that live
/// under Trip (Chat, People, Notes) so their links and notifications keep working.
List<TripNavTab> compassPagerTabs({required bool chatEnabled, required bool showNotesTab}) => List.unmodifiable([
  ...compassDockTabs(),
  if (chatEnabled) TripNavTab.chat,
  TripNavTab.members,
  if (showNotesTab) TripNavTab.notes,
]);

/// Calm Passport trip dock (flag `enableCalmPassportUi`): Balances, Spend, Activity, Plans, Hub. Chat opens from
/// the Hub and People from the header; Plans drops out when notes and passes are off.
List<TripNavTab> calmDockTabs({required bool showNotesTab}) => List.unmodifiable([
  TripNavTab.ledger,
  TripNavTab.expenses,
  TripNavTab.activity,
  if (showNotesTab) TripNavTab.notes,
  TripNavTab.hub,
]);

/// Every Calm Passport pager page: the dock, then Chat and People so their links keep working.
List<TripNavTab> calmPagerTabs({required bool chatEnabled, required bool showNotesTab}) => List.unmodifiable([
  ...calmDockTabs(showNotesTab: showNotesTab),
  if (chatEnabled) TripNavTab.chat,
  TripNavTab.members,
]);

/// Calm Passport dock item for [current]: Chat and People light up Hub.
TripNavTab calmDockTabFor(TripNavTab current) =>
    current == TripNavTab.members || current == TripNavTab.chat ? TripNavTab.hub : current;

/// The dock item that lights up for [current]: Chat, People and Notes belong to the Trip hub.
TripNavTab compassDockTabFor(TripNavTab current) =>
    current == TripNavTab.members || current == TripNavTab.notes || current == TripNavTab.chat
    ? TripNavTab.hub
    : current;
