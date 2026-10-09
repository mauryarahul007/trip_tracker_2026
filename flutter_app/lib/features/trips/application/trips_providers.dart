import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/storage/prefs.dart';
import '../../../core/env/app_env.dart';
import '../../../data/providers.dart';
import '../../../data/sync/outbox_store.dart';
import '../../../data/sync/outbox_types.dart';
import '../../../domain/logic/trip_utilities.dart' show sortTrips;
import '../../../domain/models/trip.dart';
import '../../travel/places/place_image_service.dart';

final tripsProvider = StreamProvider<List<Trip>>((ref) => ref.watch(tripRepositoryProvider).watchTrips());

enum TripSort { date, name }

class TripSortMode extends Notifier<TripSort> {
  @override
  TripSort build() => TripSort.date;
  void set(TripSort s) => state = s;
}

final tripSortProvider = NotifierProvider<TripSortMode, TripSort>(TripSortMode.new);

enum TripsView { list, cards }

/// List or card-stack Trips home, remembered on the device. The list is the default.
class TripsViewMode extends Notifier<TripsView> {
  static const _key = 'trips_view_mode';

  @override
  TripsView build() =>
      ref.read(sharedPreferencesProvider).getString(_key) == 'cards' ? TripsView.cards : TripsView.list;

  void set(TripsView v) {
    state = v;
    ref.read(sharedPreferencesProvider).setString(_key, v.name);
  }
}

final tripsViewProvider = NotifierProvider<TripsViewMode, TripsView>(TripsViewMode.new);

class TripSearch extends Notifier<String> {
  @override
  String build() => '';
  void set(String q) => state = q;
}

final tripSearchProvider = NotifierProvider<TripSearch, String>(TripSearch.new);

/// Sorts via the web-parity [sortTrips] (which works on maps).
List<Trip> sortTripModels(List<Trip> trips, TripSort mode) {
  final byId = {for (final t in trips) t.id: t};
  final sorted = sortTrips([for (final t in trips) t.toJson()], mode == TripSort.name ? 'name' : 'date');
  return [for (final m in sorted) byId[m['id']]!];
}

bool tripMatches(Trip t, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return true;
  return t.name.toLowerCase().contains(q) || (t.destination ?? '').toLowerCase().contains(q);
}

class TripLists {
  const TripLists({required this.active, required this.archived, required this.total});
  final List<Trip> active;
  final List<Trip> archived;

  /// Trips before search filtering (distinguishes "no trips" from "no matches").
  final int total;
}

final tripListsProvider = Provider<AsyncValue<TripLists>>((ref) {
  final mode = ref.watch(tripSortProvider);
  final query = ref.watch(tripSearchProvider);
  return ref.watch(tripsProvider).whenData((all) {
    final sorted = sortTripModels(all, mode).where((t) => tripMatches(t, query)).toList();
    return TripLists(
      active: [
        for (final t in sorted)
          if (!t.archived) t,
      ],
      archived: [
        for (final t in sorted)
          if (t.archived) t,
      ],
      total: all.length,
    );
  });
});

class SyncStatus {
  const SyncStatus({this.pending = 0, this.issues = 0});
  final int pending;
  final int issues;
  bool get idle => pending == 0 && issues == 0;
}

/// Outbox summary for the status chip. Guests/demo and no-backend builds
/// never sync, so they always read as idle.
final syncStatusProvider = StreamProvider<SyncStatus>((ref) {
  final a = ref.watch(authStateProvider);
  if (!AppEnv.current.hasBackend || !a.isAuthenticated || a.isLocalOnly) return Stream.value(const SyncStatus());
  return ref
      .watch(outboxStoreProvider)
      .watchAll()
      .map(
        (items) => SyncStatus(
          pending: items.where((i) => i.status != OutboxStatus.poison).length,
          issues: items.where((i) => i.status == OutboxStatus.poison).length,
        ),
      );
});

/// True while the coordinator is pulling. Local-only/guest sessions never sync.
final tripsSyncingProvider = StreamProvider<bool>((ref) async* {
  final a = ref.watch(authStateProvider);
  if (!AppEnv.current.hasBackend || !a.isAuthenticated || a.isLocalOnly) {
    yield false;
    return;
  }
  final c = ref.watch(syncCoordinatorProvider);
  yield c.isPulling;
  yield* c.pullingChanges;
});

final syncItemsProvider = StreamProvider<List<OutboxItem>>((ref) => ref.watch(outboxStoreProvider).watchAll());

/// Pull-to-refresh: push then pull when this account syncs; no-op otherwise.
final refreshTripsProvider = Provider<Future<void> Function()>(
  (ref) => () async {
    final a = ref.read(authStateProvider);
    if (!AppEnv.current.hasBackend || !a.isAuthenticated || a.isLocalOnly) return;
    await ref.read(syncCoordinatorProvider).syncNow();
  },
);

/// Looks a destination up for a cover photo (Wikipedia). Overridden in tests so nothing touches the network.
final tripCoverResolverProvider = Provider<Future<String?> Function(String destination)>(
  (ref) =>
      (destination) => resolveDestinationImage(destination),
);

/// Search terms for a trip's destination field: the whole text, then its first place when several are listed
/// ("Gangtok → Lachung → Pelling", "Goa, India").
List<String> destinationQueries(String destination) {
  final whole = destination.trim();
  if (whole.isEmpty) return const [];
  final first = whole.split(RegExp(r'\s*(?:→|->|>|,|;|\||/)\s*')).first.trim();
  return [whole, if (first.isNotEmpty && first != whole) first];
}

/// The photo for a trip: its own cover if it has one, else one found from the destination typed when it was
/// created. Null when there is neither (callers fall back to a tinted gradient). Cached per (cover, destination).
final tripCoverProvider = FutureProvider.family<String?, (String, String)>((ref, key) async {
  if (key.$1.isNotEmpty) return key.$1;
  final resolve = ref.watch(tripCoverResolverProvider);
  for (final q in destinationQueries(key.$2)) {
    final url = await resolve(q);
    if (url != null) return url;
  }
  return null;
});

(String, String) tripCoverKey(Trip t) => (t.coverImageUrl ?? '', t.destination ?? '');
