import 'dart:convert';

import 'package:http/http.dart' as http;

const String _osrmRouteUrl = 'https://router.project-osrm.org/route/v1/driving/';
final Map<String, List<({double lat, double lng})>?> _routeCache = {};

/// Fetches real road-following geometry between stops in visit order via OSRM.
/// Returns null on any failure (caller keeps the straight-line fallback).
/// Parity with web `fetchRoadRoute` in `src/components/TripMapHero.tsx`.
Future<List<({double lat, double lng})>?> fetchRoadRoute(
  List<({double lat, double lng})> stops, {
  http.Client? client,
}) async {
  if (stops.length < 2) return null;

  final cacheKey = stops.map((s) => '${s.lng.toStringAsFixed(4)},${s.lat.toStringAsFixed(4)}').join(';');
  if (_routeCache.containsKey(cacheKey)) {
    return _routeCache[cacheKey];
  }

  final httpClient = client ?? http.Client();
  try {
    final coords = stops.map((s) => '${s.lng},${s.lat}').join(';');
    final url = Uri.parse('$_osrmRouteUrl$coords?overview=full&geometries=geojson');

    final response = await httpClient
        .get(url, headers: {'Accept': 'application/json'})
        .timeout(const Duration(seconds: 4));

    if (response.statusCode != 200) {
      _routeCache[cacheKey] = null;
      return null;
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final routes = data['routes'] as List<dynamic>?;
    if (routes == null || routes.isEmpty) {
      _routeCache[cacheKey] = null;
      return null;
    }

    final geometry = routes.first['geometry'] as Map<String, dynamic>?;
    if (geometry == null || geometry['type'] != 'LineString') {
      _routeCache[cacheKey] = null;
      return null;
    }

    final rawCoordinates = geometry['coordinates'] as List<dynamic>?;
    if (rawCoordinates == null) {
      _routeCache[cacheKey] = null;
      return null;
    }

    final coordinates = <({double lat, double lng})>[];
    for (final pt in rawCoordinates) {
      if (pt is List && pt.length >= 2) {
        final lng = (pt[0] as num).toDouble();
        final lat = (pt[1] as num).toDouble();
        coordinates.add((lat: lat, lng: lng));
      }
    }

    _routeCache[cacheKey] = coordinates;
    return coordinates;
  } catch (_) {
    _routeCache[cacheKey] = null;
    return null;
  } finally {
    if (client == null) {
      httpClient.close();
    }
  }
}
