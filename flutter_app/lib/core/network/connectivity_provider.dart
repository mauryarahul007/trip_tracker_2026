import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provider for device network connectivity status.
/// Emits true if device has at least one active network interface (wifi, mobile, ethernet).
final isOnlineProvider = StreamProvider<bool>((ref) {
  final connectivity = Connectivity();

  return connectivity.onConnectivityChanged.map((results) {
    return _hasActiveConnection(results);
  }).distinct();
});

/// Synchronous or initial connectivity check helper.
Future<bool> checkInitialConnection() async {
  try {
    final results = await Connectivity().checkConnectivity();
    return _hasActiveConnection(results);
  } catch (_) {
    return true; // Default optimistic assume online
  }
}

bool _hasActiveConnection(List<ConnectivityResult> results) {
  if (results.isEmpty) return false;
  return results.any(
    (r) =>
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.ethernet ||
        r == ConnectivityResult.vpn,
  );
}
