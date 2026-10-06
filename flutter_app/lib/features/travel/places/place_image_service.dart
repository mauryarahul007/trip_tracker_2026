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

/// Resolves a verified cover photo for a destination using Wikipedia REST APIs.
/// Parity with web `placeImageService.ts`. Zero API keys required.
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

  final future = _fetchImage(trimmed, client: client);
  _inFlight[key] = future;

  try {
    final result = await future;
    _imageCache[key] = result;
    return result;
  } finally {
    unawaited(_inFlight.remove(key));
  }
}

Future<String?> _fetchImage(String place, {http.Client? client}) async {
  final httpClient = client ?? http.Client();
  try {
    final encoded = Uri.encodeComponent(place.replaceAll(' ', '_'));
    final url = Uri.parse('https://en.wikipedia.org/api/rest_v1/page/summary/$encoded');
    final response = await httpClient
        .get(url, headers: {'Accept': 'application/json', 'User-Agent': 'TripTracker/3.0'})
        .timeout(const Duration(seconds: 4));

    if (response.statusCode != 200) return null;

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final original = data['originalimage'] as Map<String, dynamic>?;
    final thumbnail = data['thumbnail'] as Map<String, dynamic>?;

    final origSource = original?['source'] as String?;
    final thumbSource = thumbnail?['source'] as String?;

    if (origSource != null && isPhotoUrl(origSource)) {
      return toSizedThumbnail(origSource, width: coverWidth);
    }
    if (thumbSource != null && isPhotoUrl(thumbSource)) {
      return thumbSource;
    }
    return null;
  } catch (_) {
    return null;
  } finally {
    if (client == null) {
      httpClient.close();
    }
  }
}
