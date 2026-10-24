import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/flags/compass_flags.dart';
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
  if (ref.watch(compassFlagProvider((calmPassportFlag, tripId)))) {
    return calmPagerTabs(
      chatEnabled: flag('enableTripChat'),
      showNotesTab: flag('enableNotesAndChecklist') || flag('enableTravelPasses'),
    );
  }
  if (ref.watch(compassFlagProvider((compassNavFlag, tripId)))) {
    return compassPagerTabs(
      chatEnabled: flag('enableTripChat'),
      // Chat lives inside Notes, so a trip with chat on keeps the Notes page even when notes and passes are off.
      showNotesTab: flag('enableNotesAndChecklist') || flag('enableTravelPasses') || flag('enableTripChat'),
    );
  }
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

/// Tabs in the trip's bottom bar. Legacy: every visible tab. Compass: Balances, Spend, Activity, Trip (Chat,
/// People and Notes stay swipeable pages but sit under Trip).
final dockTabsProvider = Provider.family<List<TripNavTab>, String>((ref, tripId) {
  if (ref.watch(compassFlagProvider((calmPassportFlag, tripId)))) {
    bool flag(String key) => ref.watch(flagProvider((key, tripId))).value ?? (defaultFeatureFlags[key] ?? false);
    return calmDockTabs(
      chatEnabled: flag('enableTripChat'),
      showNotesTab: flag('enableNotesAndChecklist') || flag('enableTravelPasses'),
    );
  }
  if (!ref.watch(compassFlagProvider((compassNavFlag, tripId)))) return ref.watch(visibleTabsProvider(tripId));
  return compassDockTabs();
});

/// Fires each time a trip shell is torn down (the trip page was left).
final tripShellClosed = StreamController<void>.broadcast();

/// Opens [tripId] from inside another trip. go_router keeps one shell state per route (a GlobalKey), and a plain
/// `go` to another trip's URL reuses it: only the page you are on changes while every other tab keeps the old
/// trip's pages. So leave the trip first, wait until its shell is really gone, then open the new trip: every tab,
/// filter and number belongs to the new trip. [tab] defaults to the trip's first page (Balances under Compass).
void openTripFresh(BuildContext context, String tripId, {String? tab, String? name}) {
  final router = GoRouter.of(context);
  final target = tab == null ? '/trip/$tripId' : '/trip/$tripId/$tab';
  // A cover over the app hides the home screen that shows for a moment while the old trip closes.
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  final theme = Theme.of(context);
  OverlayEntry? cover;
  if (overlay != null) {
    cover = OverlayEntry(
      builder: (_) => Material(
        key: const Key('trip-switch-cover'),
        color: theme.scaffoldBackgroundColor,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 3)),
              const SizedBox(height: 16),
              Text(name == null ? 'Switching trip…' : 'Switching to $name…', style: theme.textTheme.titleMedium),
            ],
          ),
        ),
      ),
    );
    overlay.insert(cover);
  }
  void dropCover() {
    final c = cover;
    cover = null;
    c?.remove();
  }

  StreamSubscription<void>? sub;
  Timer? fallback;
  void open() {
    if (sub == null) return;
    unawaited(sub!.cancel());
    sub = null;
    fallback?.cancel();
    router.go(target);
    Timer(const Duration(milliseconds: 450), dropCover);
  }

  sub = tripShellClosed.stream.listen((_) => open());
  fallback = Timer(const Duration(milliseconds: 1500), open); // if no shell was open, nothing to wait for
  router.go('/');
}

/// Whether the route map is open above the trip pages (toggled from the Trip hub or the trip menu).
class TripMapOpen extends Notifier<bool> {
  TripMapOpen(this.tripId);
  final String tripId;
  @override
  bool build() => false;
  void toggle() => state = !state;
}

final tripMapOpenProvider = NotifierProvider.family<TripMapOpen, bool, String>(TripMapOpen.new);
