import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/repositories/notification_prefs_repository.dart';

/// Null client (guest/demo, no backend): reads return defaults, writes are no-ops.
class SupabaseNotificationPrefsRepository implements NotificationPrefsRepository {
  SupabaseNotificationPrefsRepository(this._client);

  final SupabaseClient? _client;

  String? get _uid => _client?.auth.currentUser?.id;

  @override
  Future<QuietHoursPref> getQuietHours() async {
    final uid = _uid;
    if (uid == null) return const QuietHoursPref();
    final row = await _client!
        .from('quiet_hours_prefs')
        .select('enabled, start_time, end_time, timezone')
        .eq('user_id', uid)
        .maybeSingle();
    if (row == null) return const QuietHoursPref();
    return QuietHoursPref(
      enabled: row['enabled'] == true,
      startTime: row['start_time'] as String? ?? '22:00',
      endTime: row['end_time'] as String? ?? '07:00',
      timezone: row['timezone'] as String? ?? 'UTC',
    );
  }

  @override
  Future<void> setQuietHours(QuietHoursPref p) async {
    final uid = _uid;
    if (uid == null) return;
    await _client!.from('quiet_hours_prefs').upsert({
      'user_id': uid,
      'enabled': p.enabled,
      'start_time': p.startTime,
      'end_time': p.endTime,
      'timezone': p.timezone,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    }, onConflict: 'user_id');
  }

  @override
  Future<bool> getDigest() async {
    final uid = _uid;
    if (uid == null) return false;
    final row = await _client!.from('notification_digest_prefs').select('enabled').eq('user_id', uid).maybeSingle();
    return row?['enabled'] == true;
  }

  @override
  Future<void> setDigest(bool enabled) async {
    final uid = _uid;
    if (uid == null) return;
    await _client!.from('notification_digest_prefs').upsert({
      'user_id': uid,
      'enabled': enabled,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    }, onConflict: 'user_id');
  }

  @override
  Future<bool> isTripMuted(String tripId) async {
    final uid = _uid;
    if (uid == null) return false;
    final row = await _client!
        .from('trip_mutes')
        .select('trip_id')
        .eq('user_id', uid)
        .eq('trip_id', tripId)
        .maybeSingle();
    return row != null;
  }

  @override
  Future<void> setTripMuted(String tripId, bool muted) async {
    final uid = _uid;
    if (uid == null) return;
    final t = _client!.from('trip_mutes');
    if (muted) {
      await t.upsert({'user_id': uid, 'trip_id': tripId}, onConflict: 'user_id,trip_id');
    } else {
      await t.delete().eq('user_id', uid).eq('trip_id', tripId);
    }
  }
}
