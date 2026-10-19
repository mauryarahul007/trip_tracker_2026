import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/models/trip.dart';
import '../domain/trip_tabs.dart';

/// The trip being viewed, live from local storage (null once deleted).
final tripProvider = StreamProvider.family<Trip?, String>((ref, id) => ref.watch(tripRepositoryProvider).watchTrip(id));

/// Bottom-nav tabs for a trip, from the same Ops Deck flags the web uses
/// (per-trip overrides apply). Mirrors App.tsx: notes/passes/chat flags decide
/// whether the Notes tab shows, `enableChatFirstNav` puts Chat first.
final visibleTabsProvider = Provider.family<List<TripNavTab>, String>((ref, tripId) {
  // While flags load, use the registry defaults so the tab bar never flickers.
  bool flag(String key) => ref.watch(flagProvider((key, tripId))).value ?? (defaultFeatureFlags[key] ?? false);
  final chatFirst = flag('enableChatFirstNav');
  return visibleTripTabs(
    isChatFirstNav: chatFirst,
    showNotesTab: showNotesNavTab(
      isNotesEnabled: flag('enableNotesAndChecklist'),
      isPassesEnabled: flag('enableTravelPasses'),
      isTripChatEnabled: flag('enableTripChat'),
      isChatFirstNav: chatFirst,
    ),
  );
});
