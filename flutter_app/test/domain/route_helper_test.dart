import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/route_helper.dart';
import 'package:trip_tracker/domain/models/trip.dart';

void main() {
  group('parseTripRoute parity with web', () {
    test('parses multi-stop trip when 2+ stops are provided', () {
      final res = parseTripRoute(
        stops: const [
          TripStop(id: 's1', name: 'Guwahati'),
          TripStop(id: 's2', name: 'Shillong'),
          TripStop(id: 's3', name: 'Tawang'),
        ],
      );
      expect(res.origin, 'Guwahati');
      expect(res.destination, 'Tawang');
      expect(res.fullRoute, 'Guwahati ➔ Shillong ➔ Tawang');
      expect(res.allStops, ['Guwahati', 'Shillong', 'Tawang']);
      expect(res.isMultiStop, isTrue);
    });

    test('parses 1 stop with composite destination', () {
      final res = parseTripRoute(
        destination: 'Delhi to Manali',
        stops: const [TripStop(id: 's1', name: 'Delhi')],
      );
      expect(res.origin, 'Delhi');
      expect(res.destination, 'Manali');
      expect(res.fullRoute, 'Delhi ➔ Manali');
      expect(res.allStops, ['Delhi', 'Manali']);
      expect(res.isMultiStop, isTrue);
    });

    test('parses composite destination string when stops list is empty', () {
      final res = parseTripRoute(destination: 'Meghalaya -> Arunachal Pradesh');
      expect(res.origin, 'Meghalaya');
      expect(res.destination, 'Arunachal Pradesh');
      expect(res.fullRoute, 'Meghalaya ➔ Arunachal Pradesh');
      expect(res.isMultiStop, isTrue);
    });

    test('falls back safely for single city destination', () {
      final res = parseTripRoute(destination: 'Manali');
      expect(res.origin, 'Manali');
      expect(res.destination, 'Manali');
      expect(res.fullRoute, 'Manali');
      expect(res.isMultiStop, isFalse);
    });
  });

  group('getItineraryRouteInfo & extractPrimaryCity', () {
    test('extracts primary city from arrows or commas', () {
      final city1 = extractPrimaryCity('Manali → Shimla → Chandigarh', null);
      expect(city1.primary, 'Manali');
      expect(city1.full, 'Manali → Shimla → Chandigarh');

      final city2 = extractPrimaryCity(null, const [
        TripStop(id: '1', name: 'Paris'),
        TripStop(id: '2', name: 'Rome'),
      ]);
      expect(city2.primary, 'Paris');
      expect(city2.full, 'Paris → Rome');
    });

    test('formats route summaries according to stop count', () {
      final info2 = getItineraryRouteInfo('Goa -> Mumbai', null);
      expect(info2.badgeSummary, 'Goa (+1)');
      expect(info2.routeSummary, 'Goa ➔ Mumbai');

      final info5 = getItineraryRouteInfo(
        'Delhi -> Jaipur -> Jodhpur -> Udaipur -> Agra',
        null,
      );
      expect(info5.badgeSummary, 'Delhi (+4)');
      expect(info5.routeSummary, 'Delhi ➔ Agra · 5 stops');
    });
  });

  group('collectTripPhotoPlaces', () {
    test(
      'extracts unique places in priority order ignoring case and digits',
      () {
        final places = collectTripPhotoPlaces('Goa, Mumbai -> Goa', [
          'Pune',
          '123',
          'pune',
          'Goa',
        ]);
        expect(places, ['Goa', 'Mumbai', 'Pune']);
      },
    );
  });

  group('median & squaredDist', () {
    test('computes median correctly for odd and even lists', () {
      expect(median([10.0, 50.0, 20.0]), 20.0);
      expect(median([10.0, 30.0, 20.0, 40.0]), 25.0);
    });

    test('computes squared distance', () {
      expect(squaredDist(0.0, 0.0, 3.0, 4.0), 25.0);
    });
  });
}
