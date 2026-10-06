import 'dart:convert';

import 'package:http/http.dart' as http;

import 'place_gazetteer.dart';

enum SuggestionSource { local, online }

class PlaceSuggestion {
  final String name;
  final String detail;
  final String countryCode;
  final SuggestionSource source;

  const PlaceSuggestion({
    required this.name,
    required this.detail,
    required this.countryCode,
    required this.source,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'detail': detail,
    'countryCode': countryCode,
    'source': source.name,
  };
}

const String _photonUrl =
    'https://photon.komoot.io/api/?limit=6&lang=en&layer=city&layer=state&layer=country&layer=district&layer=county&q=';

final Map<String, List<PlaceSuggestion>> _onlineCache = {};

/// Offline suggestions: prefix matches and close misspellings from the curated gazetteer.
/// Parity with web `localSuggestions` in `src/services/placeSuggest.ts`.
List<PlaceSuggestion> localSuggestions(
  String query, {
  List<String> pastDestinations = const [],
  int limit = 5,
}) {
  final q = normalizeQuery(query);
  if (q.length < 2) return const [];

  final pool = <PlaceSuggestion>[
    ...gazetteer.map(
      (e) => PlaceSuggestion(
        name: e.name,
        detail: e.region,
        countryCode: e.countryCode,
        source: SuggestionSource.local,
      ),
    ),
    ...pastDestinations.map(
      (name) => PlaceSuggestion(
        name: name,
        detail: 'Used before',
        countryCode: '',
        source: SuggestionSource.local,
      ),
    ),
  ];

  final scored = <({PlaceSuggestion suggestion, double score})>[];
  final seen = <String>{};

  for (final s in pool) {
    final n = normalizeQuery(s.name);
    if (n.isEmpty || seen.contains(n)) continue;

    double? score;
    if (n == q) {
      score = 0.0;
    } else if (n.startsWith(q)) {
      score = 0.5;
    } else {
      final dist = editDistance(q, n);
      if (dist <= typoTolerance(q.length)) {
        score = dist.toDouble();
      } else if (q.length >= 3 &&
          n.length > q.length &&
          editDistance(q, n.substring(0, q.length)) <= 1) {
        score = 1.5;
      }
    }

    if (score != null) {
      seen.add(n);
      scored.add((suggestion: s, score: score));
    }
  }

  scored.sort((a, b) {
    final cmp = a.score.compareTo(b.score);
    if (cmp != 0) return cmp;
    return a.suggestion.name.length.compareTo(b.suggestion.name.length);
  });

  return scored.take(limit).map((x) => x.suggestion).toList();
}

/// Online suggestions from Photon (Komoot). Empty when offline or on network failure.
/// Parity with web `onlineSuggestions` in `src/services/placeSuggest.ts`.
Future<List<PlaceSuggestion>> onlineSuggestions(
  String query, {
  http.Client? client,
}) async {
  final q = normalizeQuery(query);
  if (q.length < 3) return const [];

  final cached = _onlineCache[q];
  if (cached != null) return cached;

  final httpClient = client ?? http.Client();
  try {
    final url = Uri.parse('$_photonUrl${Uri.encodeComponent(q)}');
    final response = await httpClient
        .get(url)
        .timeout(const Duration(seconds: 4));

    if (response.statusCode != 200) return const [];

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final features = (data['features'] as List<dynamic>?) ?? [];

    final seen = <String>{};
    final out = <PlaceSuggestion>[];

    for (final f in features) {
      final props = (f['properties'] as Map<String, dynamic>?) ?? {};
      final name = (props['name'] as String?)?.trim();
      if (name == null || name.isEmpty) continue;

      final state = props['state'] as String?;
      final country = props['country'] as String?;
      final countryCode = ((props['countrycode'] as String?) ?? '')
          .toUpperCase();

      final details = [
        state,
        country,
      ].where((x) => x != null && x != name).join(', ');
      final key = '${normalizeQuery(name)}|$details';

      if (seen.contains(key)) continue;
      seen.add(key);

      out.add(
        PlaceSuggestion(
          name: name,
          detail: details,
          countryCode: countryCode,
          source: SuggestionSource.online,
        ),
      );
    }

    _onlineCache[q] = out;
    return out;
  } catch (_) {
    return const [];
  } finally {
    if (client == null) {
      httpClient.close();
    }
  }
}

/// Unified place suggestion query with local fallback and deduplication.
Future<List<PlaceSuggestion>> getPlaceSuggestions(
  String query, {
  List<String> pastDestinations = const [],
  bool includeOnline = true,
  http.Client? client,
}) async {
  final local = localSuggestions(query, pastDestinations: pastDestinations);
  if (!includeOnline || normalizeQuery(query).length < 3) {
    return local;
  }

  final online = await onlineSuggestions(query, client: client);
  final seenNames = local.map((s) => normalizeQuery(s.name)).toSet();
  final merged = [...local];

  for (final s in online) {
    if (!seenNames.contains(normalizeQuery(s.name))) {
      merged.add(s);
      seenNames.add(normalizeQuery(s.name));
    }
  }

  return merged;
}
