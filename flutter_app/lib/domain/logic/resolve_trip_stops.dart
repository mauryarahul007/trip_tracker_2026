import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/trip.dart';

final Map<String, ({double lat, double lng})> _geocodeCache = {};

/// Parses delimiters in destination strings (e.g. "Delhi -> Agra -> Jaipur" or "Sikkim")
/// and returns clean stop names in trip order.
List<String> parseDestinationStopNames(String destination) {
  final clean = destination.trim();
  if (clean.isEmpty) return const [];

  final rawParts = clean.split(RegExp(r'(?:-->|->|→|/|\||,|\s+to\s+)', caseSensitive: false));
  final stopNames = <String>[];
  final seen = <String>{};

  for (final raw in rawParts) {
    final part = raw.trim();
    if (part.isEmpty) continue;
    final lower = part.toLowerCase();
    if (seen.contains(lower)) continue;
    seen.add(lower);
    stopNames.add(part);
  }

  return stopNames.isNotEmpty ? stopNames : [clean];
}

/// Geocodes a place name to (lat, lng) using Photon (Komoot) with Nominatim fallback.
/// Caches responses in memory so repeated queries across screen transitions are instantaneous.
Future<({double lat, double lng})?> geocodePlaceName(String query, {http.Client? client}) async {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return null;

  final cached = _geocodeCache[q];
  if (cached != null) return cached;

  final httpClient = client ?? http.Client();
  try {
    // 1. Try Photon Komoot OSM geocoder (fast, keyless, rate-limit tolerant)
    final photonUri = Uri.parse('https://photon.komoot.io/api/?limit=1&lang=en&q=${Uri.encodeComponent(query.trim())}');
    final photonRes = await httpClient.get(photonUri).timeout(const Duration(seconds: 4));

    if (photonRes.statusCode == 200) {
      final data = jsonDecode(photonRes.body) as Map<String, dynamic>;
      final features = data['features'] as List<dynamic>?;
      if (features != null && features.isNotEmpty) {
        final geom = features.first['geometry'] as Map<String, dynamic>?;
        final coords = geom?['coordinates'] as List<dynamic>?;
        if (coords != null && coords.length >= 2) {
          final lng = (coords[0] as num).toDouble();
          final lat = (coords[1] as num).toDouble();
          final result = (lat: lat, lng: lng);
          _geocodeCache[q] = result;
          return result;
        }
      }
    }

    // 2. Fallback to OpenStreetMap Nominatim
    final nominatimUri = Uri.parse(
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${Uri.encodeComponent(query.trim())}',
    );
    final nomRes = await httpClient
        .get(nominatimUri, headers: {'Accept': 'application/json', 'User-Agent': 'TripTrackerApp/3.83'})
        .timeout(const Duration(seconds: 4));

    if (nomRes.statusCode == 200) {
      final list = jsonDecode(nomRes.body) as List<dynamic>?;
      if (list != null && list.isNotEmpty) {
        final item = list.first as Map<String, dynamic>;
        final lat = double.tryParse(item['lat']?.toString() ?? '');
        final lng = double.tryParse(item['lon']?.toString() ?? '');
        if (lat != null && lng != null) {
          final result = (lat: lat, lng: lng);
          _geocodeCache[q] = result;
          return result;
        }
      }
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

/// Resolves a trip's stops into coordinate-backed [TripStop] instances.
/// If `trip.stops` is empty, extracts stop names from `trip.destination`
/// (e.g. "Bagdogra -> Gangtok -> Lachung") and geocodes any missing coordinates.
/// Parity with web `useResolvedTripStops` in `src/hooks/useResolvedTripStops.ts`.
Future<List<TripStop>> resolveTripStops(Trip trip, {http.Client? client}) async {
  // If trip already has explicit stops with coordinates, return them
  if (trip.stops.isNotEmpty && trip.stops.any((s) => s.lat != null && s.lng != null)) {
    return trip.stops.where((s) => s.lat != null && s.lng != null).toList();
  }

  // Derive stop list: either from existing trip.stops names or destination string
  var stopCandidates = <TripStop>[];
  if (trip.stops.isNotEmpty) {
    stopCandidates = List.of(trip.stops);
  } else if (trip.destination != null && trip.destination!.trim().isNotEmpty) {
    final names = parseDestinationStopNames(trip.destination!);
    stopCandidates = names.asMap().entries.map((e) {
      return TripStop(id: 'stop_${e.key + 1}', name: e.value);
    }).toList();
  }

  if (stopCandidates.isEmpty) return const [];

  final resolved = <TripStop>[];
  for (final stop in stopCandidates) {
    if (stop.lat != null && stop.lng != null) {
      resolved.add(stop);
      continue;
    }

    final coords = await geocodePlaceName(stop.name, client: client);
    if (coords != null) {
      resolved.add(TripStop(id: stop.id, name: stop.name, lat: coords.lat, lng: coords.lng));
    } else {
      resolved.add(stop);
    }
  }

  // Filter to only those with valid numeric coordinates
  return resolved.where((s) => s.lat != null && s.lng != null).toList();
}
