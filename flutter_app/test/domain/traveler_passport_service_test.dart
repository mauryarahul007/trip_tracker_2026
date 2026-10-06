import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/traveler_passport_service.dart';
import 'package:trip_tracker/domain/models/trip.dart';

Trip _makeTrip({
  String? destination,
  String startDate = '2026-01-01',
  String endDate = '2026-01-03',
  bool closed = false,
}) {
  return Trip(
    id: 't',
    name: 'T',
    startDate: startDate,
    endDate: endDate,
    baseCurrency: 'INR',
    destination: destination,
    closed: closed,
    memberIds: const [],
    groupIds: const [],
    ownerId: 'u',
    joinCode: 'ABC123',
    createdAt: 0,
    updatedAt: 0,
  );
}

final _now = DateTime.utc(2026, 6, 1);

void main() {
  group('traveler_passport_service', () {
    test('is all zeros with no trips', () {
      final p = computeTravelerPassport([], _now);
      expect(p.trips, 0);
      expect(p.destinations, 0);
      expect(p.tripsSettled, 0);
      expect(p.daysOnTheRoad, 0);
    });

    test('counts distinct destinations case-insensitively and ignores blanks', () {
      final p = computeTravelerPassport(
        [
          _makeTrip(destination: 'Goa'),
          _makeTrip(destination: ' goa '),
          _makeTrip(destination: 'Bali'),
          _makeTrip(destination: '  '),
          _makeTrip(),
        ],
        _now,
      );
      expect(p.destinations, 2);
      expect(p.trips, 5);
    });

    test('counts closed trips as settled', () {
      final p = computeTravelerPassport(
        [
          _makeTrip(closed: true),
          _makeTrip(closed: false),
          _makeTrip(),
        ],
        _now,
      );
      expect(p.tripsSettled, 1);
    });

    test('sums inclusive days for past trips, clips future trips out and in-progress trips to today', () {
      final past = _makeTrip(startDate: '2026-01-01', endDate: '2026-01-03'); // 3 days
      final future = _makeTrip(startDate: '2026-09-01', endDate: '2026-09-05'); // not started
      final inProgress = _makeTrip(startDate: '2026-05-30', endDate: '2026-06-10'); // 30 May..1 Jun = 3 days
      final p = computeTravelerPassport([past, future, inProgress], _now);
      expect(p.daysOnTheRoad, 6);
    });

    test('caps a single trip and skips bad or reversed dates', () {
      final longTrip = _makeTrip(startDate: '2020-01-01', endDate: '2026-01-01');
      final reversed = _makeTrip(startDate: '2026-02-01', endDate: '2026-01-01');
      final bad = _makeTrip(startDate: 'nope', endDate: 'nope');
      final p = computeTravelerPassport([longTrip, reversed, bad], _now);
      expect(p.daysOnTheRoad, 366);
    });
  });
}
