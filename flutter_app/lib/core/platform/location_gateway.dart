import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// Normalized location permission status across iOS and Android.
enum LocationPermissionStatus {
  serviceDisabled,
  denied,
  deniedForever,
  whileInUse,
  always;

  bool get hasPermission => this == whileInUse || this == always;
}

/// Normalized geo-position data.
class UserLocation {
  const UserLocation({required this.lat, required this.lng, this.accuracy, this.altitude, this.speed, this.timestamp});

  final double lat;
  final double lng;
  final double? accuracy;
  final double? altitude;
  final double? speed;
  final DateTime? timestamp;

  @override
  String toString() => 'UserLocation($lat, $lng, acc: $accuracy)';
}

/// Abstract contract for device location services to decouple
/// Flutter plugins and allow deterministic headless testing.
abstract class LocationGateway {
  Future<bool> isLocationServiceEnabled();
  Future<LocationPermissionStatus> checkPermission();
  Future<LocationPermissionStatus> requestPermission();
  Future<UserLocation?> getCurrentPosition();
  Stream<UserLocation> getPositionStream({Duration interval = const Duration(seconds: 30)});
  Future<bool> openAppSettings();
  Future<bool> openLocationSettings();
}

/// Production implementation wrapping [geolocator].
class GeolocatorLocationGateway implements LocationGateway {
  const GeolocatorLocationGateway();

  LocationPermissionStatus _mapPermission(LocationPermission perm, bool serviceEnabled) {
    if (!serviceEnabled) {
      return LocationPermissionStatus.serviceDisabled;
    }
    switch (perm) {
      case LocationPermission.denied:
        return LocationPermissionStatus.denied;
      case LocationPermission.deniedForever:
        return LocationPermissionStatus.deniedForever;
      case LocationPermission.whileInUse:
        return LocationPermissionStatus.whileInUse;
      case LocationPermission.always:
        return LocationPermissionStatus.always;
      case LocationPermission.unableToDetermine:
        return LocationPermissionStatus.denied;
    }
  }

  @override
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<LocationPermissionStatus> checkPermission() async {
    final serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionStatus.serviceDisabled;
    }
    final perm = await Geolocator.checkPermission();
    return _mapPermission(perm, serviceEnabled);
  }

  @override
  Future<LocationPermissionStatus> requestPermission() async {
    final serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionStatus.serviceDisabled;
    }
    final perm = await Geolocator.requestPermission();
    return _mapPermission(perm, serviceEnabled);
  }

  @override
  Future<UserLocation?> getCurrentPosition() async {
    try {
      final serviceEnabled = await isLocationServiceEnabled();
      if (!serviceEnabled) {
        return null;
      }
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        return null;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 10)),
      );
      return UserLocation(
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        altitude: pos.altitude,
        speed: pos.speed,
        timestamp: pos.timestamp,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<UserLocation> getPositionStream({Duration interval = const Duration(seconds: 30)}) {
    return Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.medium,
        distanceFilter: 25, // meters
        timeLimit: interval,
      ),
    ).map(
      (pos) => UserLocation(
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        altitude: pos.altitude,
        speed: pos.speed,
        timestamp: pos.timestamp,
      ),
    );
  }

  @override
  Future<bool> openAppSettings() => Geolocator.openAppSettings();

  @override
  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();
}

/// Fake implementation of [LocationGateway] for deterministic testing.
class FakeLocationGateway implements LocationGateway {
  FakeLocationGateway({
    this.serviceEnabled = true,
    this.permission = LocationPermissionStatus.always,
    this.currentPosition = const UserLocation(lat: 15.2993, lng: 74.1240), // Goa default
  });

  bool serviceEnabled;
  LocationPermissionStatus permission;
  UserLocation? currentPosition;
  final StreamController<UserLocation> _streamController = StreamController<UserLocation>.broadcast();

  void emitPosition(UserLocation position) {
    currentPosition = position;
    _streamController.add(position);
  }

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<LocationPermissionStatus> checkPermission() async {
    if (!serviceEnabled) {
      return LocationPermissionStatus.serviceDisabled;
    }
    return permission;
  }

  @override
  Future<LocationPermissionStatus> requestPermission() async {
    if (!serviceEnabled) {
      return LocationPermissionStatus.serviceDisabled;
    }
    return permission;
  }

  @override
  Future<UserLocation?> getCurrentPosition() async {
    if (!serviceEnabled || !permission.hasPermission) {
      return null;
    }
    return currentPosition;
  }

  @override
  Stream<UserLocation> getPositionStream({Duration interval = const Duration(seconds: 30)}) {
    return _streamController.stream;
  }

  @override
  Future<bool> openAppSettings() async => true;

  @override
  Future<bool> openLocationSettings() async => true;
}

/// Riverpod provider for [LocationGateway].
final locationGatewayProvider = Provider<LocationGateway>((ref) {
  return const GeolocatorLocationGateway();
});
