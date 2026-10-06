import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:trip_tracker/features/travel/places/place_image_service.dart';

void main() {
  group('place_image_service url transformations', () {
    test('normalizeWikimediaWidth maps to Wikimedia standards', () {
      expect(normalizeWikimediaWidth(200), 250);
      expect(normalizeWikimediaWidth(400), 500);
      expect(normalizeWikimediaWidth(800), 960);
      expect(normalizeWikimediaWidth(1200), 960);
    });

    test('toSizedThumbnail rewrites wikimedia original to thumbnail', () {
      const orig =
          'https://upload.wikimedia.org/wikipedia/commons/a/ab/Goa_Beach.jpg';
      final thumb = toSizedThumbnail(orig, width: 960);
      expect(
        thumb,
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Goa_Beach.jpg/960px-Goa_Beach.jpg',
      );
    });

    test('coverImageUrlAtWidth scales Unsplash parameters', () {
      const unsplash =
          'https://images.unsplash.com/photo-123?w=1080&auto=format';
      final sized = coverImageUrlAtWidth(unsplash, 500);
      expect(sized, contains('w=500'));
    });

    test('isPhotoUrl filters maps, flags, and diagrams', () {
      expect(
        isPhotoUrl(
          'https://upload.wikimedia.org/wikipedia/commons/Map-Goa.png',
        ),
        isFalse,
      );
      expect(
        isPhotoUrl(
          'https://upload.wikimedia.org/wikipedia/commons/Flag_of_India.svg',
        ),
        isFalse,
      );
      expect(
        isPhotoUrl(
          'https://upload.wikimedia.org/wikipedia/commons/a/ab/Goa_sunset.jpg',
        ),
        isTrue,
      );
    });
  });

  group('resolveDestinationImage', () {
    test('fetches and caches Wikipedia summary photo', () async {
      final mockClient = MockClient((request) async {
        final body = jsonEncode({
          'thumbnail': {
            'source': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Shimla.jpg/300px-Shimla.jpg',
            'width': 300,
            'height': 200,
          },
        });
        return http.Response(body, 200);
      });

      final img = await resolveDestinationImage('Shimla', client: mockClient);
      expect(img, contains('Shimla.jpg'));

      // Subsequent call uses cache (mock client won't even be called)
      final cached = await resolveDestinationImage('Shimla');
      expect(cached, img);
    });
  });
}
