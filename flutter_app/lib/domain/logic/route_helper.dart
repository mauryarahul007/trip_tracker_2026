import '../models/trip.dart';

class ParsedRoute {
  final String origin;
  final String destination;
  final String fullRoute;
  final List<String> allStops;
  final bool isMultiStop;

  const ParsedRoute({
    required this.origin,
    required this.destination,
    required this.fullRoute,
    required this.allStops,
    required this.isMultiStop,
  });
}

class ItineraryRouteInfo {
  final String primary;
  final String full;
  final List<String> segments;
  final int stopsCount;
  final String routeSummary;
  final String badgeSummary;

  const ItineraryRouteInfo({
    required this.primary,
    required this.full,
    required this.segments,
    required this.stopsCount,
    required this.routeSummary,
    required this.badgeSummary,
  });
}

final _splitPattern = RegExp(r'->|→|➔|\bto\b|\/| - ', caseSensitive: false);
final _segmentSplit = RegExp(r'\s*(?:→|->|=>|—|–|\||\/|,|;)\s*');
final _placeSplit = RegExp(r'\s*(?:→|->|=>|—|–|\||\/|,|;|&|\band\b)\s*', caseSensitive: false);

/// Intelligently parse trip origin, destination, and full itinerary route
/// from stops list, trip destination string, or trip composite title.
/// Parity with web `parseTripRoute` in `src/utils/routeHelper.ts`.
ParsedRoute parseTripRoute({String? name, String? destination, List<TripStop>? stops}) {
  final stopNames = stops?.map((s) => s.name.trim()).where((s) => s.isNotEmpty).toList() ?? [];

  if (stopNames.length >= 2) {
    return ParsedRoute(
      origin: stopNames.first,
      destination: stopNames.last,
      fullRoute: stopNames.join(' ➔ '),
      allStops: stopNames,
      isMultiStop: true,
    );
  }

  if (stopNames.length == 1) {
    final rawDest = (destination ?? name ?? '').trim();
    final parts = rawDest.split(_splitPattern).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
    final dest = parts.length > 1
        ? parts.last
        : (rawDest.isNotEmpty && rawDest != stopNames.first ? rawDest : stopNames.first);
    final all = {stopNames.first, dest}.toList();
    return ParsedRoute(
      origin: stopNames.first,
      destination: dest,
      fullRoute: stopNames.first == dest ? stopNames.first : '${stopNames.first} ➔ $dest',
      allStops: all,
      isMultiStop: stopNames.first != dest,
    );
  }

  final raw = (destination ?? name ?? 'Trip').trim();
  final parts = raw.split(_splitPattern).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

  if (parts.length >= 2) {
    return ParsedRoute(
      origin: parts.first,
      destination: parts.last,
      fullRoute: parts.join(' ➔ '),
      allStops: parts,
      isMultiStop: true,
    );
  }

  return ParsedRoute(
    origin: raw.isNotEmpty ? raw : 'Departure',
    destination: raw.isNotEmpty ? raw : 'Destination',
    fullRoute: raw,
    allStops: [raw],
    isMultiStop: false,
  );
}

/// Extracts primary single destination city for compact card badges.
/// Parity with web `extractPrimaryCity` in `src/utils/tripDestination.ts`.
({String primary, String full}) extractPrimaryCity(String? destination, List<TripStop>? stops) {
  final full = (destination ?? (stops != null && stops.isNotEmpty ? stops.map((s) => s.name).join(' → ') : '')).trim();
  if (full.isEmpty) return (primary: '', full: '');
  final segments = full.split(_segmentSplit).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
  final primary = segments.isNotEmpty ? segments.first : full;
  return (primary: primary, full: full);
}

/// Formats multi-city routes and stops for clean card and capsule layouts.
/// Parity with web `getItineraryRouteInfo` in `src/utils/tripDestination.ts`.
ItineraryRouteInfo getItineraryRouteInfo(String? destination, List<TripStop>? stops) {
  final res = extractPrimaryCity(destination, stops);
  if (res.full.isEmpty) {
    return const ItineraryRouteInfo(
      primary: '',
      full: '',
      segments: [],
      stopsCount: 0,
      routeSummary: '',
      badgeSummary: '',
    );
  }

  final segments = res.full.split(_segmentSplit).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
  final stopsCount = segments.length;
  var routeSummary = res.full;
  var badgeSummary = res.primary;

  if (stopsCount > 1) {
    badgeSummary = '${res.primary} (+${stopsCount - 1})';
    if (stopsCount <= 3) {
      routeSummary = segments.join(' ➔ ');
    } else {
      routeSummary = '${segments.first} ➔ ${segments.last} · $stopsCount stops';
    }
  }

  return ItineraryRouteInfo(
    primary: res.primary,
    full: res.full,
    segments: segments,
    stopsCount: stopsCount,
    routeSummary: routeSummary,
    badgeSummary: badgeSummary,
  );
}

/// Collects distinct place names whose photos can be displayed for the trip.
/// Parity with web `collectTripPhotoPlaces` in `src/utils/tripPhotoPlaces.ts`.
List<String> collectTripPhotoPlaces(String? destination, List<String>? stops) {
  final seen = <String>{};
  final places = <String>[];

  void add(String? raw) {
    final name = raw?.trim() ?? '';
    if (name.length < 2 || RegExp(r'^\d+$').hasMatch(name)) return;
    final key = name.toLowerCase();
    if (seen.contains(key)) return;
    seen.add(key);
    places.add(name);
  }

  for (final part in (destination ?? '').split(_placeSplit)) {
    add(part);
  }
  for (final stop in stops ?? const <String>[]) {
    add(stop);
  }
  return places;
}

/// Median helper for geographic coordinates disambiguation.
double median(List<double> nums) {
  if (nums.isEmpty) return 0.0;
  final sorted = [...nums]..sort();
  final mid = sorted.length ~/ 2;
  return sorted.length % 2 != 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/// Squared Euclidean distance for coordinate comparison.
double squaredDist(double lat1, double lng1, double lat2, double lng2) {
  final dLat = lat1 - lat2;
  final dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
}
