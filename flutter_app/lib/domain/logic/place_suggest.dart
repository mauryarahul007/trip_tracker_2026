import 'dart:convert';

import 'package:http/http.dart' as http;

import 'place_gazetteer.dart';

/// Port of `src/services/placeSuggest.ts` (enableDestinationAutocomplete):
/// offline-first suggestions, Photon (komoot) for real places, "did you mean".
class PlaceSuggestion {
  const PlaceSuggestion({required this.name, required this.detail, required this.countryCode, this.online = false});
  final String name;

  /// "Kerala, India": shown under the name, never saved.
  final String detail;
  final String countryCode;
  final bool online;
}

const _photonUrl =
    'https://photon.komoot.io/api/?limit=6&lang=en&layer=city&layer=state&layer=country&layer=district&layer=county&q=';

final _marks = RegExp('[̀-ͯ]');
final _spaces = RegExp(r'\s+');

const _accents = {
  'à': 'a',
  'á': 'a',
  'â': 'a',
  'ã': 'a',
  'ä': 'a',
  'å': 'a',
  'ç': 'c',
  'è': 'e',
  'é': 'e',
  'ê': 'e',
  'ë': 'e',
  'ì': 'i',
  'í': 'i',
  'î': 'i',
  'ï': 'i',
  'ñ': 'n',
  'ò': 'o',
  'ó': 'o',
  'ô': 'o',
  'õ': 'o',
  'ö': 'o',
  'ù': 'u',
  'ú': 'u',
  'û': 'u',
  'ü': 'u',
  'ý': 'y',
  'ÿ': 'y',
  'ā': 'a',
  'ī': 'i',
  'ū': 'u',
  'ś': 's',
  'ṇ': 'n',
  'ṭ': 't',
};

String _normalize(String s) {
  final lower = s.toLowerCase().replaceAll(_marks, '');
  final buf = StringBuffer();
  for (final r in lower.runes) {
    final ch = String.fromCharCode(r);
    buf.write(_accents[ch] ?? ch);
  }
  return buf.toString().replaceAll(_spaces, ' ').trim();
}

/// Edit distance counting a swapped pair of letters as one edit ("Swtizerland").
int editDistance(String a, String b) {
  final d = List.generate(a.length + 1, (i) => List<int>.filled(b.length + 1, 0)..[0] = i);
  for (var j = 1; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (var i = 1; i <= a.length; i++) {
    for (var j = 1; j <= b.length; j++) {
      final cost = a[i - 1] == b[j - 1] ? 0 : 1;
      var v = [d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost].reduce((x, y) => x < y ? x : y);
      if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) {
        v = v < d[i - 2][j - 2] + 1 ? v : d[i - 2][j - 2] + 1;
      }
      d[i][j] = v;
    }
  }
  return d[a.length][b.length];
}

/// How many typos a word of this length may contain and still count as a match.
int _tolerance(int len) => len <= 4 ? 1 : (len <= 8 ? 2 : 3);

/// Offline suggestions: prefix matches (while typing) and close misspellings.
List<PlaceSuggestion> localSuggestions(String query, {List<String> pastDestinations = const [], int limit = 5}) {
  final q = _normalize(query);
  if (q.length < 2) return const [];
  final pool = <PlaceSuggestion>[
    for (final (name, detail, cc) in gazetteer) PlaceSuggestion(name: name, detail: detail, countryCode: cc),
    for (final name in pastDestinations) PlaceSuggestion(name: name, detail: 'Used before', countryCode: ''),
  ];
  final scored = <(PlaceSuggestion, double)>[];
  final seen = <String>{};
  for (final s in pool) {
    final n = _normalize(s.name);
    if (n.isEmpty || seen.contains(n)) continue;
    double? score;
    if (n == q) {
      score = 0;
    } else if (n.startsWith(q)) {
      score = 0.5;
    } else {
      final dist = editDistance(q, n);
      if (dist <= _tolerance(q.length)) {
        score = dist.toDouble();
      } else if (q.length >= 3 && n.length > q.length && editDistance(q, n.substring(0, q.length)) <= 1) {
        // Still typing: compare against the same-length start of the name.
        score = 1.5;
      }
    }
    if (score != null) {
      seen.add(n);
      scored.add((s, score));
    }
  }
  scored.sort((a, b) {
    final c = a.$2.compareTo(b.$2);
    return c != 0 ? c : a.$1.name.length.compareTo(b.$1.name.length);
  });
  return [for (final e in scored.take(limit)) e.$1];
}

final _onlineCache = <String, List<PlaceSuggestion>>{};

/// Online suggestions from Photon. Empty (never throws) when offline or on error.
Future<List<PlaceSuggestion>> onlineSuggestions(String query, {http.Client? client}) async {
  final q = _normalize(query);
  if (q.length < 3) return const [];
  final cached = _onlineCache[q];
  if (cached != null) return cached;
  final c = client ?? http.Client();
  try {
    final res = await c.get(Uri.parse(_photonUrl + Uri.encodeQueryComponent(q))).timeout(const Duration(seconds: 6));
    if (res.statusCode != 200) return const [];
    final features = (jsonDecode(res.body) as Map)['features'] as List? ?? const [];
    final seen = <String>{};
    final out = <PlaceSuggestion>[];
    for (final f in features) {
      final p = (f as Map)['properties'] as Map? ?? const {};
      final name = p['name'] as String?;
      if (name == null || name.isEmpty) continue;
      final detail = [p['state'], p['country']].whereType<String>().where((x) => x.isNotEmpty && x != name).join(', ');
      if (!seen.add('${_normalize(name)}|$detail')) continue;
      out.add(
        PlaceSuggestion(
          name: name,
          detail: detail,
          countryCode: ((p['countrycode'] as String?) ?? '').toUpperCase(),
          online: true,
        ),
      );
    }
    return _onlineCache[q] = out;
  } catch (_) {
    return const [];
  } finally {
    if (client == null) c.close();
  }
}

/// Local first, then online, one entry per place name + country.
List<PlaceSuggestion> mergeSuggestions(List<PlaceSuggestion> local, List<PlaceSuggestion> online, {int limit = 6}) {
  final seen = <String>{};
  return [
    for (final s in [...local, ...online])
      if (seen.add('${_normalize(s.name)}|${s.countryCode}')) s,
  ].take(limit).toList();
}

final _separator = RegExp(r'\s*(?:,|&|/|→|->|\band\b)\s*', caseSensitive: false);

/// Splits "Goa, Gokarna & Hampi" into its places (same separators the web map uses).
List<String> splitDestination(String text) => [
  for (final p in text.split(_separator))
    if (p.trim().isNotEmpty) p.trim(),
];

/// The place being typed is the text after the last separator: "Goa, Gokar"
/// suggests for "Gokar" and a pick keeps "Goa, ".
({String prefix, String part}) currentPart(String value) {
  final ms = _separator.allMatches(value).toList();
  if (ms.isEmpty) return (prefix: '', part: value.trim());
  final cut = ms.last.end;
  return (prefix: '${value.substring(0, ms.last.start).trimRight()}, ', part: value.substring(cut).trim());
}

/// A likely fix for a misspelled place in the destination.
class PlaceFix {
  const PlaceFix(this.typed, this.suggestion);
  final String typed;
  final PlaceSuggestion suggestion;
}

/// Every misspelled place in the destination, in the order typed. Only offered
/// when the word is a few typos away from a known place and does not already
/// match one: never for "Goa Beach" vs "Goa".
List<PlaceFix> findPlaceFixes(String destination, {List<PlaceSuggestion> candidates = const []}) {
  final fixes = <PlaceFix>[];
  for (final part in splitDestination(destination)) {
    final p = _normalize(part);
    if (p.length < 3) continue;
    final pool = [...localSuggestions(part), ...candidates];
    if (pool.any((c) => _normalize(c.name) == p)) continue;
    PlaceSuggestion? best;
    var bestDist = 1 << 30;
    for (final c in pool) {
      final dist = editDistance(p, _normalize(c.name));
      if (dist > 0 && dist <= _tolerance(p.length) && dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }
    if (best != null) fixes.add(PlaceFix(part, best));
  }
  return fixes;
}

/// Replaces one place inside the destination text, keeping the rest.
String replacePlace(String destination, String typed, String replacement) {
  final i = destination.toLowerCase().indexOf(typed.toLowerCase());
  return i < 0 ? replacement : destination.substring(0, i) + replacement + destination.substring(i + typed.length);
}

/// Applies several fixes at once, each replacing only its own place.
String applyPlaceFixes(String destination, List<PlaceFix> fixes) =>
    fixes.fold(destination, (text, f) => replacePlace(text, f.typed, f.suggestion.name));

String? currencyForCountry(String countryCode) => countryCurrency[countryCode.toUpperCase()];
