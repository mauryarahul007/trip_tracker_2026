/// Quiet hours (`quiet_hours_prefs`), daily digest (`notification_digest_prefs`) and per-trip
/// mutes (`trip_mutes`). All server-backed, exactly like the web: the push server reads them.
class QuietHoursPref {
  const QuietHoursPref({this.enabled = false, this.startTime = '22:00', this.endTime = '07:00', this.timezone = 'UTC'});

  final bool enabled;
  final String startTime; // "HH:MM" local
  final String endTime; // "HH:MM" local
  final String timezone; // IANA

  QuietHoursPref copyWith({bool? enabled, String? startTime, String? endTime, String? timezone}) => QuietHoursPref(
    enabled: enabled ?? this.enabled,
    startTime: startTime ?? this.startTime,
    endTime: endTime ?? this.endTime,
    timezone: timezone ?? this.timezone,
  );
}

abstract class NotificationPrefsRepository {
  Future<QuietHoursPref> getQuietHours();
  Future<void> setQuietHours(QuietHoursPref pref);
  Future<bool> getDigest();
  Future<void> setDigest(bool enabled);
  Future<bool> isTripMuted(String tripId);
  Future<void> setTripMuted(String tripId, bool muted);
}
