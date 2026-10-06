import 'dart:convert';

import 'currency.dart';

/// Port of `fetchExchangeRates` in `src/utils/currencyFx.ts`.
///
/// Flutter's converter pivots through USD (`defaultExchangeRates`), so the
/// live fetch asks Frankfurter for `from=USD`. A miss (offline, timeout,
/// bad JSON) keeps the last cache, then the built-in table.
class CachedRates {
  const CachedRates({required this.timestamp, required this.rates});
  final int timestamp;
  final Map<String, double> rates;

  Map<String, dynamic> toJson() => {'timestamp': timestamp, 'rates': rates};

  static CachedRates? tryParse(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final json = jsonDecode(raw);
      if (json is! Map) return null;
      final rates = <String, double>{};
      final rawRates = json['rates'];
      if (rawRates is Map) {
        for (final e in rawRates.entries) {
          final n = e.value;
          if (n is num) rates[e.key.toString().toUpperCase()] = n.toDouble();
        }
      }
      if (rates.isEmpty) return null;
      return CachedRates(timestamp: (json['timestamp'] as num?)?.toInt() ?? 0, rates: rates);
    } catch (_) {
      return null;
    }
  }
}

const fxCacheTtl = Duration(hours: 24);
const fxCacheKey = 'trip_tracker_fx_rates_USD';

typedef RateFetcher = Future<Map<String, double>?> Function();

/// [fetch] returns USD-based rates (USD = 1) or null on failure.
Future<Map<String, double>> loadExchangeRates({
  required String? cachedJson,
  required Future<void> Function(String json) writeCache,
  required bool online,
  required RateFetcher fetch,
  DateTime? now,
}) async {
  final clock = now ?? DateTime.now();
  final cached = CachedRates.tryParse(cachedJson);
  if (cached != null && clock.millisecondsSinceEpoch - cached.timestamp < fxCacheTtl.inMilliseconds) {
    return {...defaultExchangeRates, ...cached.rates, 'USD': 1.0};
  }
  if (online) {
    try {
      final live = await fetch();
      if (live != null && live.isNotEmpty) {
        final rates = {...live, 'USD': 1.0};
        await writeCache(jsonEncode(CachedRates(timestamp: clock.millisecondsSinceEpoch, rates: rates).toJson()));
        return {...defaultExchangeRates, ...rates};
      }
    } catch (_) {}
  }
  if (cached != null) return {...defaultExchangeRates, ...cached.rates, 'USD': 1.0};
  return defaultExchangeRates;
}
