import 'package:shared_preferences/shared_preferences.dart';

enum GrowthEvent {
  appOpen('app_open'),
  syncFail('sync_fail'),
  queueStuck('queue_stuck'),
  flushOk('flush_ok');

  const GrowthEvent(this.wire);
  final String wire;
}

const _openDayKey = 'growth.open_day';
const _stuckAfter = Duration(minutes: 10);

/// Port of `growthTelemetry.ts` (flag `enableGrowthTelemetry`). Content-free events only:
/// app_open once per UTC day, sync_fail / queue_stuck / flush_ok once per session.
/// [send] never throws into the UI; the server also refuses inserts while the flag is off.
class GrowthTelemetry {
  GrowthTelemetry({required this.send, required SharedPreferences prefs, DateTime Function()? now})
    : _prefs = prefs, // ignore: prefer_initializing_formals
      _now = now ?? DateTime.now;

  final Future<void> Function(String userId, String event) send;
  final SharedPreferences _prefs;
  final DateTime Function() _now;

  bool _on = false;
  String? _userId;
  final _sent = <GrowthEvent>{};
  DateTime? _stuckSince;

  void configure({required bool on, required String? userId}) {
    final wasOn = _on && _userId == userId;
    _on = on && userId != null;
    _userId = userId;
    _stuckSince = null;
    if (_on && !wasOn) _trackOpenOncePerDay();
  }

  void _trackOpenOncePerDay() {
    final today = _now().toUtc().toIso8601String().substring(0, 10);
    if (_prefs.getString(_openDayKey) == today) return;
    _prefs.setString(_openDayKey, today);
    _emit(GrowthEvent.appOpen);
  }

  void track(GrowthEvent e) {
    if (!_on || e == GrowthEvent.appOpen || !_sent.add(e)) return; // an event seen while off must not use up its slot
    _emit(e);
  }

  /// Feed the outbox depth; a queue that never drains for 10 minutes while online is "stuck".
  void onQueue({required int pending, required bool online}) {
    if (!_on) return;
    if (!online || pending == 0) {
      _stuckSince = null;
      return;
    }
    _stuckSince ??= _now();
    if (_now().difference(_stuckSince!) >= _stuckAfter) track(GrowthEvent.queueStuck);
  }

  void _emit(GrowthEvent e) {
    final uid = _userId;
    if (!_on || uid == null) return;
    send(uid, e.wire).then((_) {}, onError: (_) {});
  }
}
