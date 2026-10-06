import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/location_gateway.dart';
import '../../../data/repositories/supabase_location_share_repository.dart';
import '../../../domain/repositories/location_share_repository.dart';

class LiveLocationService with WidgetsBindingObserver {
  LiveLocationService({
    required this.locationGateway,
    required this.locationShareRepository,
  }) {
    WidgetsBinding.instance.addObserver(this);
  }

  final LocationGateway locationGateway;
  final LocationShareRepository locationShareRepository;

  String? _activeTripId;
  Timer? _heartbeatTimer;
  static const Duration heartbeatInterval = Duration(seconds: 60);

  String? get activeTripId => _activeTripId;
  bool get isHeartbeatActive => _heartbeatTimer != null && _activeTripId != null;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _activeTripId != null) {
      tick();
    }
  }

  Future<void> tick() async {
    final tripId = _activeTripId;
    if (tripId == null) {
      return;
    }
    try {
      final pos = await locationGateway.getCurrentPosition();
      if (pos != null) {
        await locationShareRepository.updateLocationShare(
          tripId: tripId,
          lat: pos.lat,
          lng: pos.lng,
        );
      }
    } catch (_) {
      // Best-effort network or sensor error; keep timer running
    }
  }

  void startHeartbeat(String tripId) {
    if (_activeTripId == tripId && _heartbeatTimer != null) {
      tick();
      return;
    }
    stopHeartbeat();
    _activeTripId = tripId;
    tick();
    _heartbeatTimer = Timer.periodic(heartbeatInterval, (_) {
      tick();
    });
  }

  void stopHeartbeat([String? tripId]) {
    if (tripId != null && _activeTripId != null && tripId != _activeTripId) {
      return;
    }
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _activeTripId = null;
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    stopHeartbeat();
  }
}

final liveLocationServiceProvider = Provider<LiveLocationService>((ref) {
  final location = ref.watch(locationGatewayProvider);
  final shareRepo = ref.watch(locationShareRepositoryProvider);
  final service = LiveLocationService(
    locationGateway: location,
    locationShareRepository: shareRepo,
  );
  ref.onDispose(service.dispose);
  return service;
});
