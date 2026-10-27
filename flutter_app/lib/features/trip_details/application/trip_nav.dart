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

/// Bottom-nav pages for a trip. One navigation ships: the Calm Passport dock (Balances, Spend, Activity, Plans, Hub)
/// with Chat and People as extra pages. The old Compass dock and the chat-first legacy bar are retired in the app,
/// so `enableCompassNav`, `enableCalmPassportUi` and `enableChatFirstNav` no longer change it. Notes, passes and chat
/// flags (per-trip overrides apply) still decide whether Plans and Chat appear.
final visibleTabsProvider = Provider.family<List<TripNavTab>, String>((ref, tripId) {
  // While flags load, use the registry defaults so the tab bar never flickers.
  bool flag(String key) => ref.watch(flagProvider((key, tripId))).value ?? (defaultFeatureFlags[key] ?? false);
  if (ref.watch(legacyNavAllowedProvider) && !ref.watch(compassFlagProvider((calmPassportFlag, tripId)))) {
    return _legacyTabs(ref, tripId, flag);
  }
  return calmPagerTabs(
    chatEnabled: flag('enableTripChat'),
    showNotesTab: flag('enableNotesAndChecklist') || flag('enableTravelPasses'),
  );
});

/// Tabs in the trip's bottom dock: the Calm Passport five (Plans drops out when notes and passes are off).
final dockTabsProvider = Provider.family<List<TripNavTab>, String>((ref, tripId) {
  bool flag(String key) => ref.watch(flagProvider((key, tripId))).value ?? (defaultFeatureFlags[key] ?? false);
  if (ref.watch(legacyNavAllowedProvider) && !ref.watch(compassFlagProvider((calmPassportFlag, tripId)))) {
    if (!ref.watch(compassFlagProvider((compassNavFlag, tripId)))) return ref.watch(visibleTabsProvider(tripId));
    return compassDockTabs();
  }
  return calmDockTabs(showNotesTab: flag('enableNotesAndChecklist') || flag('enableTravelPasses'));
});

/// The retired Compass and legacy tab sets, reachable only with [legacyNavAllowedProvider] (older tests).
List<TripNavTab> _legacyTabs(Ref ref, String tripId, bool Function(String) flag) {
  if (ref.watch(compassFlagProvider((compassNavFlag, tripId)))) {
    return compassPagerTabs(
      chatEnabled: flag('enableTripChat'),
      // Chat lives inside Notes, so a trip with chat on keeps the Notes page even when notes and passes are off.
      showNotesTab: flag('enableNotesAndChecklist') || flag('enableTravelPasses') || flag('enableTripChat'),
    );
  }
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
}

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
