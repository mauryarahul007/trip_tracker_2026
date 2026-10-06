import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../data/providers.dart';
import '../../../data/sync/outbox_store.dart';
import '../../../data/sync/outbox_types.dart';
import '../../../domain/logic/trip_utilities.dart' show sortTrips;
import '../../../domain/models/trip.dart';

final tripsProvider = StreamProvider<List<Trip>>((ref) => ref.watch(tripRepositoryProvider).watchTrips());

enum TripSort { date, name }

class TripSortMode extends Notifier<TripSort> {
  @override
  TripSort build() => TripSort.date;
  void set(TripSort s) => state = s;
}

final tripSortProvider = NotifierProvider<TripSortMode, TripSort>(TripSortMode.new);

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

final syncItemsProvider = StreamProvider<List<OutboxItem>>((ref) => ref.watch(outboxStoreProvider).watchAll());

/// Pull-to-refresh: push then pull when this account syncs; no-op otherwise.
final refreshTripsProvider = Provider<Future<void> Function()>(
  (ref) => () async {
    final a = ref.read(authStateProvider);
    if (!AppEnv.current.hasBackend || !a.isAuthenticated || a.isLocalOnly) return;
    await ref.read(syncCoordinatorProvider).syncNow();
  },
);
