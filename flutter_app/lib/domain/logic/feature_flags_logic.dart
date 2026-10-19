import 'flag_defaults.g.dart';

/// Port of `isFeatureActive` (src/utils/featureFlags.ts): user override >
/// trip override > global flag > registry default.
bool isFeatureActive(
  String key,
  Map<String, bool> globalFlags, {
  String? tripId,
  String? userId,
  Map<String, Map<String, bool>> tripOverrides = const {},
  Map<String, Map<String, bool>> userOverrides = const {},
}) {
  if (userId != null) {
    final v = userOverrides[userId]?[key];
    if (v != null) return v;
  }
  if (tripId != null) {
    final v = tripOverrides[tripId]?[key];
    if (v != null) return v;
  }
  final g = globalFlags[key];
  if (g != null) return g;
  return defaultFeatureFlags[key] ?? false;
}

/// Port of `getPackStatus`.
({int active, int total, String status}) packStatus(String packId, Map<String, bool> flags) {
  final keys = consumerPacks[packId] ?? const <String>[];
  if (keys.isEmpty) return (active: 0, total: 0, status: 'safed');
  final active = keys.where((k) => flags[k] ?? defaultFeatureFlags[k] ?? false).length;
  return (
    active: active,
    total: keys.length,
    status: active == keys.length ? 'armed' : (active > 0 ? 'partial' : 'safed'),
  );
}
