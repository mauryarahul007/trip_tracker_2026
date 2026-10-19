import '../models/trip.dart';
import 'trip_status.dart';

/// The trip an "open my latest trip" shortcut should land on: the one happening now (newest start if several),
/// else the next one coming up, else the most recent one that finished. Archived trips never count.
String? latestTripId(Iterable<Trip> trips, DateTime now) {
  final live = [
    for (final t in trips)
      if (!t.archived) t,
  ];
  if (live.isEmpty) return null;
  Trip? pick(Iterable<Trip> list, int Function(Trip a, Trip b) order) =>
      list.isEmpty ? null : (list.toList()..sort(order)).first;

  bool phase(Trip t, TripPhase p) => tripStatus(t.startDate, t.endDate, now).phase == p;
  final active = pick(live.where((t) => phase(t, TripPhase.active)), (a, b) => b.startDate.compareTo(a.startDate));
  if (active != null) return active.id;
  final upcoming = pick(live.where((t) => phase(t, TripPhase.upcoming)), (a, b) => a.startDate.compareTo(b.startDate));
  if (upcoming != null) return upcoming.id;
  final past = pick(live, (a, b) => b.endDate.compareTo(a.endDate));
  return past?.id;
}
