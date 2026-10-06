import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:trip_tracker/features/travel/places/place_gazetteer.dart';
import 'package:trip_tracker/features/travel/places/place_suggest_service.dart';

void main() {
  group('place_gazetteer algorithms', () {
    test('editDistance handles exact matches and transpositions', () {
      expect(editDistance('Goa', 'Goa'), 0);
      expect(editDistance('Swtizerland', 'Switzerland'), 1);
      expect(editDistance('Paris', 'Pris'), 1);
    });

    test('normalizeQuery trims, lowercases and strips diacritics', () {
      expect(normalizeQuery('  Zürich  '), 'zurich');
      expect(normalizeQuery('NEW   YORK'), 'new york');
    });
  });

  group('localSuggestions', () {
    test('returns empty on queries shorter than 2 chars', () {
      expect(localSuggestions('a'), isEmpty);
    });

    test('finds exact and prefix matches from gazetteer', () {
      final res = localSuggestions('Goa');
      expect(res, isNotEmpty);
      expect(res.first.name, 'Goa');
      expect(res.first.source, SuggestionSource.local);
    });

    test('recovers from typos via edit distance (Swtizerland -> Switzerland)', () {
      final res = localSuggestions('Swtizerland');
      expect(res.any((s) => s.name == 'Switzerland'), isTrue);
    });

    test('includes past destinations with Used before subtitle', () {
      final res = localSuggestions('Kashmir', pastDestinations: ['Kashmir Valley']);
      expect(res.any((s) => s.name == 'Kashmir Valley' && s.detail == 'Used before'), isTrue);
    });
  });

  group('onlineSuggestions with mock client', () {
    test('parses GeoJSON features from Photon', () async {
      final mockClient = MockClient((request) async {
        final body = jsonEncode({
          'features': [
            {
              'properties': {'name': 'Kyoto', 'state': 'Kyoto Prefecture', 'country': 'Japan', 'countrycode': 'jp'},
            },
          ],
        });
        return http.Response(body, 200);
      });

      final res = await onlineSuggestions('Kyo', client: mockClient);
      expect(res, hasLength(1));
      expect(res.first.name, 'Kyoto');
      expect(res.first.detail, 'Kyoto Prefecture, Japan');
      expect(res.first.countryCode, 'JP');
      expect(res.first.source, SuggestionSource.online);
    });

    test('handles network failure gracefully without throwing', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Server Error', 500);
      });

      final res = await onlineSuggestions('Tokyo', client: mockClient);
      expect(res, isEmpty);
    });
  });
}
