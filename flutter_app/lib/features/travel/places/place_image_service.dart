import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

const int coverWidth = 960;
const int peekCoverWidth = 500;

final Map<String, String?> _imageCache = {};
final Map<String, Future<String?>> _inFlight = {};

int normalizeWikimediaWidth(int width) {
  if (width <= 250) return 250;
  if (width <= 500) return 500;
  return 960;
}

final RegExp _wikimediaOriginalPathPattern = RegExp(
  r'^(/wikipedia/[^/]+/)([0-9a-f])/([0-9a-f]{2})/([^/]+)$',
  caseSensitive: false,
);
final RegExp _wikimediaThumbPxPattern = RegExp(r'/(\d+)px-([^/]+)$');
final RegExp _nonPhotoFilenamePattern = RegExp(
  r'(^|[_\-/])(map|locator|location|flag[_-]of|coat[_-]of[_-]arms|seal[_-]of|emblem|logo|chart|diagram|graph)([_\-.]|$)',
  caseSensitive: false,
);

final RegExp _travelNoiseWords = RegExp(
  r'\b(bagpacking|backpacking|trip|trips|tour|tours|touring|vacation|vacations|holiday|holidays|expedition|expeditions|getaway|getaways|travel|travels|travelling|traveling|trek|trekking|roadtrip|road\s+trip|adventure|adventures|journey|journeys|diaries|diary|visit|visiting|retreat|offsite|bachelors|honeymoon|explore|exploring|\d{4})\b',
  caseSensitive: false,
);

final RegExp _prepositionPattern = RegExp(
  r'^(to|in|at|around|near|of|from)\s+',
  caseSensitive: false,
);

const List<String> fallbackTravelPhotos = [
  // 1. Tropical Paradise Beach
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop',
  // 2. Swiss Alps Summit
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop',
  // 3. Kyoto Bamboo Forest
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  // 4. Amalfi Coastline
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1000&auto=format&fit=crop',
  // 5. Nordic Aurora Fjords
  'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1000&auto=format&fit=crop',
  // 6. Tokyo Metropolis
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1000&auto=format&fit=crop',
  // 7. Yosemite Glacial Lake
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop',
  // 8. Golden Desert Dunes
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1000&auto=format&fit=crop',
  // 9. Scenic Road Trip Highway
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop',
  // 10. Tropical Sunset Palms
  'https://images.unsplash.com/photo-1512100356356-de1b84283e18?q=80&w=1000&auto=format&fit=crop',
  // 11. Paris Bridge & Sunset
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1000&auto=format&fit=crop',
  // 12. Misty Pine Ridge
  'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1000&auto=format&fit=crop',
  // 13. Italian Dolomites Peaks
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1000&auto=format&fit=crop',
  // 14. Bali Tropical Terraces
  'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=1000&auto=format&fit=crop',
  // 15. Santorini Sunset Caldera
  'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1000&auto=format&fit=crop',
  // 16. Iceland Emerald Waterfall
  'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?q=80&w=1000&auto=format&fit=crop',
];

int _hashString(String str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.codeUnitAt(i);
    hash &= 0x7FFFFFFF;
  }
  return hash.abs();
}

/// Fallback thematic travel photography when live APIs do not return a lead photo.
/// Matches web placeImageService.ts getFallbackTravelPhoto.
String getFallbackTravelPhoto(String? seed, {int width = coverWidth}) {
  if (seed == null || seed.trim().isEmpty) {
    return coverImageUrlAtWidth(fallbackTravelPhotos[0], width) ?? fallbackTravelPhotos[0];
  }

  final s = seed.toLowerCase().trim();
  int matchedIndex = -1;

  if (RegExp(r'(beach|sea|ocean|coast|island|surf|tropical|goa|bali|maldives|phuket)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 0;
  } else if (RegExp(r'(mountain|alps|himalaya|peak|summit|snow|ski|trek|hike|sikkim|switzerland|manali|ladakh)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 1;
  } else if (RegExp(r'(forest|bamboo|nature|jungle|green|camp|trail)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 2;
  } else if (RegExp(r'(amalfi|italy|mediterranean|cliff|coastal)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 3;
  } else if (RegExp(r'(aurora|fjord|norway|iceland|arctic)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 4;
  } else if (RegExp(r'(tokyo|japan|city|metro|neon|night|urban)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 5;
  } else if (RegExp(r'(lake|reflection|valley|yosemite|national park)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 6;
  } else if (RegExp(r'(desert|dune|safari|dubai|egypt|sand)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 7;
  } else if (RegExp(r'(road|drive|highway|car|route)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 8;
  } else if (RegExp(r'(sunset|palm|evening)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 9;
  } else if (RegExp(r'(paris|europe|france|historic|bridge)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 10;
  } else if (RegExp(r'(waterfall|falls)', caseSensitive: false).hasMatch(s)) {
    matchedIndex = 15;
  }

  final selectedIndex = matchedIndex >= 0 ? matchedIndex : (_hashString(s) % fallbackTravelPhotos.length);
  final rawUrl = fallbackTravelPhotos[selectedIndex];
  return coverImageUrlAtWidth(rawUrl, width) ?? rawUrl;
}

String toSizedThumbnail(String url, {int width = coverWidth}) {
  Uri uri;
  try {
    uri = Uri.parse(url);
  } catch (_) {
    return url;
  }
  if (uri.host != 'upload.wikimedia.org') return url;

  final match = _wikimediaOriginalPathPattern.firstMatch(uri.path);
  if (match == null) return url;

  final targetWidth = normalizeWikimediaWidth(width);
  final prefix = match.group(1)!;
  final h1 = match.group(2)!;
  final h2 = match.group(3)!;
  final filename = match.group(4)!;

  return '${uri.origin}${prefix}thumb/$h1/$h2/$filename/${targetWidth}px-$filename';
}

String? coverImageUrlAtWidth(String? url, int width) {
  if (url == null || url.isEmpty) return null;
  try {
    final uri = Uri.parse(url);
    if (uri.host == 'images.unsplash.com') {
      final params = Map<String, String>.from(uri.queryParameters);
      params['w'] = width.toString();
      return uri.replace(queryParameters: params).toString();
    }
    if (uri.host != 'upload.wikimedia.org') return url;

    final targetWidth = normalizeWikimediaWidth(width);
    if (_wikimediaThumbPxPattern.hasMatch(uri.path)) {
      final newPath = uri.path.replaceAll(_wikimediaThumbPxPattern, '/${targetWidth}px-\$2');
      return uri.replace(path: newPath).toString();
    }
    return toSizedThumbnail(url, width: targetWidth);
  } catch (_) {
    return url;
  }
}

bool isPhotoUrl(String? url) {
  if (url == null || url.isEmpty) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  final lower = url.toLowerCase();
  if (lower.endsWith('.svg') || lower.endsWith('.gif') || lower.endsWith('.webp')) {
    return false;
  }
  if (_nonPhotoFilenamePattern.hasMatch(lower)) return false;
  return true;
}

/// Cleans and extracts search candidates from user destination string.
/// Strips noise words like 'bagpacking', 'trip', 'tour', and route arrows.
List<String> extractPlaceCandidates(String placeInput) {
  final candidates = <String>[];
  final compounds = <String>[];

  final parts = placeInput
      .split(RegExp(r'\s+\bor\b\s+|\s+\band\b\s+|->|[→>,/|-]', caseSensitive: false))
      .map((p) => p.trim())
      .where((p) => p.isNotEmpty)
      .toList();

  for (final part in parts) {
    candidates.add(part);
    final stripped = part.replaceAll(_travelNoiseWords, ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
    final prepStripped = stripped.replaceFirst(_prepositionPattern, '').trim();
    if (prepStripped.length >= 2 && prepStripped != part) {
      candidates.add(prepStripped);
    }
  }

  final whole = placeInput.trim();
  if (whole.isNotEmpty && !parts.contains(whole)) {
    compounds.add(whole);
    final strippedWhole = whole.replaceAll(_travelNoiseWords, ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
    if (strippedWhole.length >= 2 && strippedWhole != whole) {
      compounds.add(strippedWhole);
    }
  }

  candidates.addAll(compounds);
  return candidates.toSet().where((c) => c.length >= 2 && !RegExp(r'^\d+$').hasMatch(c)).toList();
}

/// Resolves a verified cover photo for a destination using Wikivoyage & Wikipedia REST APIs,
/// with guaranteed fallback travel photography.
Future<String?> resolveDestinationImage(String destination, {http.Client? client}) async {
  final trimmed = destination.trim();
  if (trimmed.isEmpty) return null;

  final key = trimmed.toLowerCase();
  if (_imageCache.containsKey(key)) {
    return _imageCache[key];
  }

  if (_inFlight.containsKey(key)) {
    return _inFlight[key];
  }

  final future = _fetchPlaceCover(trimmed, client: client);
  _inFlight[key] = future;

  try {
    final result = await future;
    _imageCache[key] = result;
    return result;
  } finally {
    unawaited(_inFlight.remove(key));
  }
}

Future<String?> _fetchPlaceCover(String placeInput, {http.Client? client}) async {
  final candidates = extractPlaceCandidates(placeInput);
  final httpClient = client ?? http.Client();

  try {
    for (final candidate in candidates) {
      final cleaned = candidate.replaceAll(RegExp(r'[^\w\s,-]'), '').trim();
      if (cleaned.isEmpty) continue;

      final encoded = Uri.encodeComponent(cleaned.replaceAll(' ', '_'));

      // 1. Try Wikivoyage summary (dedicated travel guide wiki, genuine tourism photography)
      try {
        final voyageUrl = Uri.parse('https://en.wikivoyage.org/api/rest_v1/page/summary/$encoded');
        final response = await httpClient
            .get(voyageUrl, headers: {'Accept': 'application/json', 'User-Agent': 'TripTracker/3.0'})
            .timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body) as Map<String, dynamic>;
          final orig = (data['originalimage'] as Map<String, dynamic>?)?['source'] as String?;
          final thumb = (data['thumbnail'] as Map<String, dynamic>?)?['source'] as String?;
          if (orig != null && isPhotoUrl(orig)) {
            return toSizedThumbnail(orig, width: coverWidth);
          }
          if (thumb != null && isPhotoUrl(thumb)) {
            return thumb;
          }
        }
      } catch (_) {}

      // 2. Try Wikipedia summary
      try {
        final wikiUrl = Uri.parse('https://en.wikipedia.org/api/rest_v1/page/summary/$encoded');
        final response = await httpClient
            .get(wikiUrl, headers: {'Accept': 'application/json', 'User-Agent': 'TripTracker/3.0'})
            .timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body) as Map<String, dynamic>;
          final orig = (data['originalimage'] as Map<String, dynamic>?)?['source'] as String?;
          final thumb = (data['thumbnail'] as Map<String, dynamic>?)?['source'] as String?;
          if (orig != null && isPhotoUrl(orig)) {
            return toSizedThumbnail(orig, width: coverWidth);
          }
          if (thumb != null && isPhotoUrl(thumb)) {
            return thumb;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to curated thematic travel photography (guaranteed non-blank)
    return getFallbackTravelPhoto(placeInput);
  } catch (_) {
    return getFallbackTravelPhoto(placeInput);
  } finally {
    if (client == null) {
      httpClient.close();
    }
  }
}
