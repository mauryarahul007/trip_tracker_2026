import 'package:drift/drift.dart';

import '../../core/logging/app_logger.dart';
import '../../domain/logic/feature_flags_logic.dart';
import '../../domain/repositories/repositories.dart';
import '../local/app_database.dart';

/// Caches `get_resolved_feature_flags` layers in the `feature_flags` table:
/// keys are `global|flag`, `user|flag`, `trip|<tripId>|flag`.
class DriftFlagsRepository implements FlagsRepository {
  DriftFlagsRepository(this._db, this._fetch);

  final AppDatabase _db;
  final Future<ResolvedFlags?> Function(String? tripId) _fetch;

  @override
  Future<void> refresh({String? tripId}) async {
    ResolvedFlags res;
    try {
      final fetched = await _fetch(tripId);
      if (fetched == null) return;
      res = fetched;
    } catch (e) {
      AppLogger.warn('Flag refresh failed, keeping cache: $e');
      return;
    }
    final now = DateTime.now().toUtc().toIso8601String();
    await _db.transaction(() async {
      Future<void> replace(String prefix, Map<String, bool> layer) async {
        await (_db.delete(_db.featureFlagsTable)..where((t) => t.key.like('$prefix|%'))).go();
        for (final e in layer.entries) {
          await _db.into(_db.featureFlagsTable).insert(
                FeatureFlagsTableCompanion.insert(key: '$prefix|${e.key}', enabled: e.value, updatedAt: now),
              );
        }
      }

      await replace('global', res.global);
      await replace('user', res.user);
      if (tripId != null) await replace('trip|$tripId', res.trip);
    });
  }

  Future<bool> _resolve(String key, String? tripId) async {
    final rows = await _db.select(_db.featureFlagsTable).get();
    final global = <String, bool>{};
    final user = <String, bool>{};
    final trip = <String, bool>{};
    for (final r in rows) {
      final p = r.key.split('|');
      if (p[0] == 'global') global[p[1]] = r.enabled;
      if (p[0] == 'user') user[p[1]] = r.enabled;
      if (p[0] == 'trip' && p[1] == tripId) trip[p[2]] = r.enabled;
    }
    return isFeatureActive(
      key,
      global,
      tripId: tripId,
      userId: 'me',
      userOverrides: {'me': user},
      tripOverrides: tripId == null ? const {} : {tripId: trip},
    );
  }

  @override
  Stream<bool> watch(String key, {String? tripId}) => _db
      .customSelect('SELECT 1', readsFrom: {_db.featureFlagsTable})
      .watch()
      .asyncMap((_) => _resolve(key, tripId))
      .distinct();
}
