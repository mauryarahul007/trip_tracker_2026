import '../models/location_share.dart';

abstract class LocationShareRepository {
  Future<MyLocationShare> startLocationShare({
    required String tripId,
    required String memberId,
    required String userId,
    required double lat,
    required double lng,
  });

  Future<void> updateLocationShare({required String tripId, required double lat, required double lng});

  Future<void> stopLocationShare(String tripId);

  Future<MyLocationShare?> getMyLocationShare(String tripId);

  Future<List<TripActiveShare>> getActiveTripLocationShares(String tripId);

  Future<SharedLocation?> getSharedLocation(String shareToken);
}
