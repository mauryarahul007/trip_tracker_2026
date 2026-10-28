import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:trip_tracker/domain/logic/resolve_trip_stops.dart';
import 'package:trip_tracker/domain/models/trip.dart';

void main() {
  group('parseDestinationStopNames', () {
    test('parses arrow separated stops', () {
      final stops = parseDestinationStopNames('Bagdogra -> Gangtok -> Lachung');
      expect(stops, ['Bagdogra', 'Gangtok', 'Lachung']);
    });

    test('parses unicode arrow separated stops', () {
      final stops = parseDestinationStopNames('Delhi → Agra → Jaipur');
      expect(stops, ['Delhi', 'Agra', 'Jaipur']);
    });

    test('parses comma and slash separated stops', () {
      final stops = parseDestinationStopNames('Zurich, Lucerne / Interlaken');
      expect(stops, ['Zurich', 'Lucerne', 'Interlaken']);
    });

    test('handles single place names without delimiters', () {
      final stops = parseDestinationStopNames('Sikkim');
      expect(stops, ['Sikkim']);
    });

    test('deduplicates identical stops', () {
      final stops = parseDestinationStopNames('Delhi -> Agra -> Delhi');
      expect(stops, ['Delhi', 'Agra']);
    });
  });

  group('resolveTripStops', () {
    test('returns existing trip stops with coordinates immediately', () async {
      const trip = Trip(
        id: 't1',
        name: 'Sikkim Trip',
        startDate: '2026-11-01',
        endDate: '2026-11-08',
        baseCurrency: 'INR',
        ownerId: 'u1',
        joinCode: 'code1',
        destination: 'Gangtok -> Lachung',
        stops: [
          TripStop(id: 's1', name: 'Gangtok', lat: 27.3389, lng: 88.6065),
          TripStop(id: 's2', name: 'Lachung', lat: 27.6891, lng: 88.7430),
        ],
        createdAt: 100,
        updatedAt: 100,
      );

      final resolved = await resolveTripStops(trip);
      expect(resolved.length, 2);
      expect(resolved.first.name, 'Gangtok');
      expect(resolved.first.lat, 27.3389);
      expect(resolved.last.name, 'Lachung');
      expect(resolved.last.lat, 27.6891);
    });

    test('geocodes destination string when stops list is empty', () async {
      const trip = Trip(
        id: 't2',
        name: 'Desert Road Trip',
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        baseCurrency: 'INR',
        ownerId: 'u1',
        joinCode: 'code2',
        destination: 'Jaipur -> Jodhpur',
        stops: [],
        createdAt: 100,
        updatedAt: 100,
      );

      final fakeClient = MockClient((request) async {
        final q = request.url.queryParameters['q'] ?? '';
        if (q.contains('Jaipur')) {
          return http.Response(
            jsonEncode({
              'features': [
                {
                  'geometry': {
                    'coordinates': [75.7873, 26.9124],
                  },
                },
              ],
            }),
            200,
          );
        } else if (q.contains('Jodhpur')) {
          return http.Response(
            jsonEncode({
              'features': [
                {
                  'geometry': {
                    'coordinates': [73.0243, 26.2389],
                  },
                },
              ],
            }),
            200,
          );
        }
        return http.Response(jsonEncode({'features': <Map<String, dynamic>>[]}), 200);
      });

      final resolved = await resolveTripStops(trip, client: fakeClient);
      expect(resolved.length, 2);
      expect(resolved[0].name, 'Jaipur');
      expect(resolved[0].lat, 26.9124);
      expect(resolved[0].lng, 75.7873);
      expect(resolved[1].name, 'Jodhpur');
      expect(resolved[1].lat, 26.2389);
      expect(resolved[1].lng, 73.0243);
    });
  });
}
