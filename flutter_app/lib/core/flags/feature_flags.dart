import 'package:flutter_riverpod/flutter_riverpod.dart';

/// App-wide feature flags model (stubbed for Phase 2, hooked to remote config in Phase 10).
class FeatureFlags {
  const FeatureFlags({
    this.isChatFirstNav = false,
    this.isNotesEnabled = true,
    this.isPassesEnabled = true,
    this.isTripChatEnabled = true,
    this.isLiveLocationEnabled = true,
    this.isOcrReceiptsEnabled = true,
    this.isOfflineSnapshotEnabled = true,
  });

  final bool isChatFirstNav;
  final bool isNotesEnabled;
  final bool isPassesEnabled;
  final bool isTripChatEnabled;
  final bool isLiveLocationEnabled;
  final bool isOcrReceiptsEnabled;
  final bool isOfflineSnapshotEnabled;
}

/// Provider for feature flags.
final featureFlagsProvider = Provider<FeatureFlags>((ref) {
  return const FeatureFlags();
});
