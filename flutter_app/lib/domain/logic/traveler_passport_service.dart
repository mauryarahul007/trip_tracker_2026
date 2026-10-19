import 'dart:math';

import '../models/trip.dart';

class TravelerPassport {
  const TravelerPassport({
    required this.trips,
    required this.destinations,
    required this.tripsSettled,
    required this.daysOnTheRoad,
  });

  final int trips;
  final int destinations;
  final int tripsSettled;
  final int daysOnTheRoad;
}

const int dayMs = 24 * 60 * 60 * 1000;
// A typo'd end date should not turn one trip into a decade of travel.
const int maxDaysPerTrip = 366;

/// Lifetime stats from trips already on the device. Destination is free text,
/// so "destinations" is a case-insensitive distinct count, not countries.
TravelerPassport computeTravelerPassport(List<Trip> trips, [DateTime? now]) {
  final referenceTime = (now ?? DateTime.now()).toUtc();
  final destinations = <String>{};
  var tripsSettled = 0;
  var daysOnTheRoad = 0;

  for (final t in trips) {
    final dest = t.destination?.trim().toLowerCase();
    if (dest != null && dest.isNotEmpty) {
      destinations.add(dest);
    }
    if (t.closed) {
      tripsSettled++;
    }

    final start = DateTime.tryParse(t.startDate)?.toUtc();
    final end = DateTime.tryParse(t.endDate)?.toUtc();
    if (start == null || end == null || end.isBefore(start) || start.isAfter(referenceTime)) {
      continue;
    }

    final lastDay = end.isAfter(referenceTime) ? referenceTime : end;
    final diffMs = lastDay.difference(start).inMilliseconds;
    final days = (diffMs / dayMs).floor() + 1;
    daysOnTheRoad += min(maxDaysPerTrip, days);
  }

  return TravelerPassport(
    trips: trips.length,
    destinations: destinations.length,
    tripsSettled: tripsSettled,
    daysOnTheRoad: daysOnTheRoad,
  );
}
