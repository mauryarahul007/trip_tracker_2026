/// Navigation tabs available within a trip context.
enum TripNavTab { chat, expenses, ledger, members, notes }

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
/// Mirrors `visibleTripTabs` in `src/utils/tripTabs.ts`.
List<TripNavTab> visibleTripTabs({required bool isChatFirstNav, required bool showNotesTab}) {
  final tabs = <TripNavTab>[];
  if (isChatFirstNav) {
    tabs.add(TripNavTab.chat);
  }
  tabs.addAll([TripNavTab.expenses, TripNavTab.ledger, TripNavTab.members]);
  if (showNotesTab) {
    tabs.add(TripNavTab.notes);
  }
  return List.unmodifiable(tabs);
}
