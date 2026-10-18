import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/deep_links.dart';
import 'package:trip_tracker/domain/logic/latest_trip.dart';
import 'package:trip_tracker/domain/models/trip.dart';

import '../support/model_builders.dart';

Trip trip(String id, String start, String end, {bool archived = false}) =>
    tripOf(id, id).copyWith(startDate: start, endDate: end, archived: archived);

void main() {
  final now = DateTime(2026, 10, 18);

  test('the trip happening now wins, then the next one coming up, then the most recent past one', () {
    final past = trip('past', '2026-09-01', '2026-09-05');
    final later = trip('later', '2026-12-01', '2026-12-05');
    final soon = trip('soon', '2026-11-01', '2026-11-05');
    final live = trip('live', '2026-10-16', '2026-10-20');
    expect(latestTripId([past, later, soon, live], now), 'live');
    expect(latestTripId([past, later, soon], now), 'soon');
    expect(latestTripId([past, trip('older', '2026-01-01', '2026-01-03')], now), 'past');
  });

  test('archived trips never count, and no trips means no answer', () {
    expect(latestTripId([trip('a', '2026-10-16', '2026-10-20', archived: true)], now), isNull);
    expect(latestTripId(const [], now), isNull);
  });

  test('shortcut links are recognised; anything else under that host is not', () {
    expect(
      routeForDeepLink(Uri.parse('com.triptracker.app://shortcut/add-expense'))?.location,
      '/shortcut/add-expense',
    );
    expect(
      routeForDeepLink(Uri.parse('com.triptracker.app://shortcut/latest-trip'))?.location,
      '/shortcut/latest-trip',
    );
    expect(routeForDeepLink(Uri.parse('com.triptracker.app://shortcut/delete-everything')), isNull);
    expect(routeForDeepLink(Uri.parse('com.triptracker.app://shortcut')), isNull);
  });
}
