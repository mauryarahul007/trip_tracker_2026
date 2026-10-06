import 'notifications.dart' show notificationTabFor;

final _tripId = RegExp(r'^[0-9a-fA-F-]{8,40}$');
final _safeRoute = RegExp(r'^/trip/[0-9a-fA-F-]{8,40}/(chat|expenses|ledger|members|notes)$');

/// Where a tapped push lands. Uses the server's `route` only when it is one of our own trip
/// tab paths (a push payload must never navigate anywhere else), otherwise rebuilds the path from
/// `type` + `tripId`. `trip_deleted` and anything without a trip go home. Null = ignore the tap.
String? routeForPush(Map<String, dynamic> data) {
  final type = data['type'] as String?;
  final tripId = data['tripId'] as String?;
  final route = data['route'] as String?;
  if (type == 'trip_deleted') return '/';
  if (route != null && _safeRoute.hasMatch(route)) return route;
  if (tripId != null && _tripId.hasMatch(tripId)) return '/trip/$tripId/${notificationTabFor(type)}';
  return route == '/' || type != null ? '/' : null;
}
