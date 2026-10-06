import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/storage/prefs.dart';

/// Destination weather and daylight conditions.
/// Parity with web `src/services/weatherService.ts`.
class WeatherData {
  final int tempC;
  final int tempF;
  final int? apparentTempC;
  final int weatherCode;
  final String weatherEmoji;
  final String condition;
  final bool isDay;
  final String city;
  final int updatedAt;

  const WeatherData({
    required this.tempC,
    required this.tempF,
    this.apparentTempC,
    required this.weatherCode,
    required this.weatherEmoji,
    required this.condition,
    required this.isDay,
    required this.city,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
    'tempC': tempC,
    'tempF': tempF,
    if (apparentTempC != null) 'apparentTempC': apparentTempC,
    'weatherCode': weatherCode,
    'weatherEmoji': weatherEmoji,
    'condition': condition,
    'isDay': isDay,
    'city': city,
    'updatedAt': updatedAt,
  };

  factory WeatherData.fromJson(Map<String, dynamic> json) => WeatherData(
    tempC: (json['tempC'] as num).toInt(),
    tempF: (json['tempF'] as num).toInt(),
    apparentTempC: (json['apparentTempC'] as num?)?.toInt(),
    weatherCode: (json['weatherCode'] as num).toInt(),
    weatherEmoji: json['weatherEmoji'] as String? ?? '☀️',
    condition: json['condition'] as String? ?? 'Fair',
    isDay: json['isDay'] as bool? ?? true,
    city: json['city'] as String? ?? '',
    updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
  );
}

/// Weather condition emoji and descriptive label matching WMO weather codes.
({String emoji, String text}) getWeatherConditionFromCode(int code, {bool isDay = true}) {
  switch (code) {
    case 0:
      return (emoji: isDay ? '☀️' : '🌙', text: 'Clear Sky');
    case 1:
    case 2:
      return (emoji: isDay ? '⛅' : '☁️', text: 'Partly Cloudy');
    case 3:
      return (emoji: '☁️', text: 'Overcast');
    case 45:
    case 48:
      return (emoji: '🌫️', text: 'Misty Fog');
    case 51:
    case 53:
    case 55:
      return (emoji: '🌦️', text: 'Light Drizzle');
    case 61:
    case 63:
    case 65:
      return (emoji: '🌧️', text: 'Rain');
    case 71:
    case 73:
    case 75:
    case 77:
      return (emoji: '❄️', text: 'Snow');
    case 80:
    case 81:
    case 82:
      return (emoji: '🌧️', text: 'Rain Showers');
    case 85:
    case 86:
      return (emoji: '🌨️', text: 'Snow Showers');
    case 95:
    case 96:
    case 99:
      return (emoji: '⛈️', text: 'Thunderstorm');
    default:
      return (emoji: isDay ? '☀️' : '🌙', text: 'Fair');
  }
}

/// Normalizes common diacritics/accents to ASCII.
String removeDiacritics(String str) {
  const withDia = 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇç';
  const withoutDia = 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCc';
  var result = str;
  for (var i = 0; i < withDia.length; i++) {
    result = result.replaceAll(withDia[i], withoutDia[i]);
  }
  return result;
}

/// Clean and extract place name candidates from composite route titles.
/// e.g. "Weekend in München -> Goa with Friends" => ["Goa", "Munchen"]
List<String> extractPlaceCandidates(dynamic raw) {
  final List<String> inputs;
  if (raw is List) {
    inputs = raw.map((e) => e?.toString() ?? '').where((s) => s.isNotEmpty).toList();
  } else if (raw is String) {
    inputs = [raw];
  } else {
    return const [];
  }

  final candidates = <String>[];
  final fillerRegex = RegExp(
    r'\b(trip|backpacking|tour|vacation|getaway|holiday|expedition|voyage|202[0-9]|roadtrip|road\s+trip|with\s+friends|with\s+family|friends|family|weekend|visit|exploring|explore|in|at|with)\b',
    caseSensitive: false,
  );
  final nonLetterRegex = RegExp(r'[^a-zA-Z\s]');
  final multiSpaceRegex = RegExp(r'\s+');
  final directionalRegex = RegExp(r'^(?:north|south|east|west|central)\s+([a-zA-Z\s]+)$', caseSensitive: false);

  for (final input in inputs) {
    if (input.trim().isEmpty) continue;
    final normalized = removeDiacritics(input);
    final segments = normalized.split(RegExp(r'->|→|\bto\b|,|/| - |&', caseSensitive: false));
    final reversed = segments.reversed.toList();

    for (final segment in reversed) {
      final cleaned = segment
          .replaceAll(fillerRegex, ' ')
          .replaceAll(nonLetterRegex, ' ')
          .replaceAll(multiSpaceRegex, ' ')
          .trim();

      if (cleaned.length >= 2 && !candidates.contains(cleaned)) {
        candidates.add(cleaned);
      }

      final dirMatch = directionalRegex.firstMatch(cleaned);
      if (dirMatch != null && dirMatch.group(1) != null) {
        final baseName = dirMatch.group(1)!.trim();
        if (baseName.length >= 2 && !candidates.contains(baseName)) {
          candidates.add(baseName);
        }
      }
    }
  }

  return candidates;
}

String cleanPlaceQuery(String raw) {
  final candidates = extractPlaceCandidates(raw);
  return candidates.isNotEmpty ? candidates.first : raw.trim();
}

bool _isBogusWeather(WeatherData? data) {
  if (data == null) return true;
  return data.weatherCode == 0 && data.tempC == 22 && data.condition == 'Clear Day' && data.tempF == 72;
}

abstract class WeatherService {
  Future<WeatherData?> getDestinationWeather(
    dynamic destination, {
    void Function(WeatherData fresh)? onLiveUpdate,
    bool forceRefresh = false,
  });
}

class DefaultWeatherService implements WeatherService {
  final http.Client _client;
  final SharedPreferences? prefs;

  DefaultWeatherService({http.Client? client, this.prefs}) : _client = client ?? http.Client();

  static const int realtimeTtlMs = 20 * 60 * 1000; // 20 minutes
  static const int maxOfflineCacheMs = 24 * 60 * 60 * 1000; // 24 hours

  final Map<String, WeatherData> _memoryCache = {};

  Future<({double lat, double lon, String name})?> _fetchSingleCoordinate(String query) async {
    if (query.trim().isEmpty) return null;

    // 1. Open-Meteo Geocoding
    try {
      final uri = Uri.parse(
        'https://geocoding-api.open-meteo.com/v1/search?name=${Uri.encodeComponent(query)}&count=1&language=en&format=json',
      );
      final res = await _client.get(uri).timeout(const Duration(milliseconds: 4000));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final results = data['results'] as List<dynamic>?;
        if (results != null && results.isNotEmpty) {
          final first = results.first as Map<String, dynamic>;
          final lat = (first['latitude'] as num).toDouble();
          final lon = (first['longitude'] as num).toDouble();
          final name = (first['name'] as String?) ?? query;
          return (lat: lat, lon: lon, name: name);
        }
      }
    } catch (_) {
      // Network or timeout
    }

    // 2. Photon Komoot OSM API fallback
    try {
      final uri = Uri.parse('https://photon.komoot.io/api/?q=${Uri.encodeComponent(query)}&limit=1');
      final res = await _client.get(uri).timeout(const Duration(milliseconds: 4000));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final features = data['features'] as List<dynamic>?;
        if (features != null && features.isNotEmpty) {
          final first = features.first as Map<String, dynamic>;
          final geometry = first['geometry'] as Map<String, dynamic>?;
          final coords = geometry?['coordinates'] as List<dynamic>?;
          if (coords != null && coords.length >= 2) {
            final lon = (coords[0] as num).toDouble();
            final lat = (coords[1] as num).toDouble();
            final properties = first['properties'] as Map<String, dynamic>?;
            final placeName = (properties?['name'] as String?) ?? query;
            return (lat: lat, lon: lon, name: placeName);
          }
        }
      }
    } catch (_) {
      // Fallback failed
    }

    return null;
  }

  Future<({double lat, double lon, String name})?> _fetchCoordinates(List<String> candidates) async {
    for (final c in candidates) {
      final coord = await _fetchSingleCoordinate(c);
      if (coord != null) return coord;
    }
    return null;
  }

  Future<WeatherData?> _fetchLiveWeather(({double lat, double lon, String name}) coords, String targetName) async {
    try {
      final uri = Uri.parse(
        'https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,weather_code,is_day',
      );
      final res = await _client.get(uri).timeout(const Duration(milliseconds: 4500));
      if (res.statusCode != 200) return null;

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final current = data['current'] as Map<String, dynamic>?;
      if (current == null) return null;

      final tempC = (current['temperature_2m'] as num).round();
      final tempF = ((tempC * 9) / 5 + 32).round();
      final apparentTempC = (current['apparent_temperature'] as num?)?.round();
      final weatherCode = (current['weather_code'] as num?)?.toInt() ?? 0;
      final isDay = (current['is_day'] as num?)?.toInt() != 0;
      final condition = getWeatherConditionFromCode(weatherCode, isDay: isDay);

      return WeatherData(
        tempC: tempC,
        tempF: tempF,
        apparentTempC: apparentTempC,
        weatherCode: weatherCode,
        weatherEmoji: condition.emoji,
        condition: condition.text,
        isDay: isDay,
        city: coords.name.isNotEmpty ? coords.name : targetName,
        updatedAt: DateTime.now().millisecondsSinceEpoch,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Future<WeatherData?> getDestinationWeather(
    dynamic destination, {
    void Function(WeatherData fresh)? onLiveUpdate,
    bool forceRefresh = false,
  }) async {
    final candidates = extractPlaceCandidates(destination);
    if (candidates.isEmpty) return null;

    final primaryTarget = candidates.first;
    final cacheKey = 'tt_weather_${primaryTarget.toLowerCase().replaceAll(RegExp(r'\s+'), '_')}';

    WeatherData? cachedData = _memoryCache[cacheKey];
    final p = prefs;
    if (cachedData == null && p != null) {
      final storedStr = p.getString(cacheKey);
      if (storedStr != null) {
        try {
          final parsed = WeatherData.fromJson(jsonDecode(storedStr) as Map<String, dynamic>);
          if (_isBogusWeather(parsed)) {
            unawaited(p.remove(cacheKey));
          } else if (DateTime.now().millisecondsSinceEpoch - parsed.updatedAt < maxOfflineCacheMs) {
            cachedData = parsed;
            _memoryCache[cacheKey] = parsed;
          }
        } catch (_) {}
      }
    }

    final now = DateTime.now().millisecondsSinceEpoch;
    final isCacheFresh = cachedData != null && (now - cachedData.updatedAt < realtimeTtlMs);

    Future<WeatherData?> executeLiveFetch() async {
      final coords = await _fetchCoordinates(candidates);
      if (coords == null) return null;

      final fresh = await _fetchLiveWeather(coords, primaryTarget);
      if (fresh != null) {
        _memoryCache[cacheKey] = fresh;
        if (p != null) {
          try {
            await p.setString(cacheKey, jsonEncode(fresh.toJson()));
          } catch (_) {}
        }
        onLiveUpdate?.call(fresh);
        return fresh;
      }
      return null;
    }

    if (!forceRefresh && isCacheFresh) {
      return cachedData;
    }

    if (cachedData != null && !forceRefresh) {
      // SWR: return cached immediately, revalidate in background
      unawaited(executeLiveFetch());
      return cachedData;
    }

    final fresh = await executeLiveFetch();
    return fresh ?? cachedData;
  }
}

class FakeWeatherService implements WeatherService {
  WeatherData? simulatedData;
  bool shouldThrow = false;
  int fetchCount = 0;

  FakeWeatherService({this.simulatedData});

  @override
  Future<WeatherData?> getDestinationWeather(
    dynamic destination, {
    void Function(WeatherData fresh)? onLiveUpdate,
    bool forceRefresh = false,
  }) async {
    fetchCount++;
    if (shouldThrow) throw Exception('Simulated weather network error');
    if (simulatedData != null) {
      onLiveUpdate?.call(simulatedData!);
    }
    return simulatedData;
  }
}

final weatherServiceProvider = Provider<WeatherService>((ref) {
  try {
    final prefs = ref.watch(sharedPreferencesProvider);
    return DefaultWeatherService(prefs: prefs);
  } catch (_) {
    return DefaultWeatherService();
  }
});
