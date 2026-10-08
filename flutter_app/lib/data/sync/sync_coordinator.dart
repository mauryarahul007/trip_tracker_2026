import 'dart:async';

import '../../core/logging/app_logger.dart';
import '../realtime/realtime_manager.dart';
import 'sync_engine.dart';
import 'trip_pull_sync.dart';

/// Decides *when* to sync: push first (so the server has our edits), then
/// pull, then (re)open realtime. Triggers: app start, foreground,
/// connectivity regained, after enqueue, and the engine's own backoff timer.
class SyncCoordinator {
  SyncCoordinator({
    required this.engine,
    required this.pull,
    required this.realtime,
    this.onPulled,
    this.retryEmptyAfter = const Duration(seconds: 3),
  });

  final SyncEngine engine;
  final TripPullSync pull;
  final RealtimeManager realtime;

  /// Called with every pull's per-trip result (conflicts, etc.).
  final void Function(Map<String, PullResult> results)? onPulled;

  /// Wait before the single re-pull after a first pull that found no trips.
  final Duration retryEmptyAfter;

  Timer? _retryTimer;
  bool _active = true;

  /// Called by repositories after every local write.
  void requestFlush() => unawaited(_flush());

  final _pulling = StreamController<bool>.broadcast();
  bool _isPulling = false;
  bool _retriedEmpty = false;

  /// True while a pull is running. The Trips screen shows "Syncing" instead of
  /// an empty state for a signed-in user whose first pull has not landed yet.
  bool get isPulling => _isPulling;
  Stream<bool> get pullingChanges => _pulling.stream;

  void _setPulling(bool v) {
    _isPulling = v;
    if (!_pulling.isClosed) _pulling.add(v);
  }

  Future<void> start() {
    _retriedEmpty = false;
    return syncNow();
  }

  Future<void> syncNow() async {
    _setPulling(true);
    try {
      await _flush();
      // Await first: `onPulled?.call(await ...)` would skip the pull when no callback is set.
      final results = await pull.syncAll();
      onPulled?.call(results);
      // The session token can lag right after sign-in and RLS then shows nothing: look once more.
      if (results.isEmpty && !_retriedEmpty) {
        _retriedEmpty = true;
        _retryTimer?.cancel();
        _retryTimer = Timer(retryEmptyAfter, () => unawaited(syncNow()));
      }
    } catch (e) {
      AppLogger.warn('Pull sync failed: $e');
    } finally {
      _setPulling(false);
    }
  }

  Future<void> onForeground() async {
    _active = true;
    realtime.resume();
    await syncNow();
  }

  Future<void> onBackground() async {
    _active = false;
    _retryTimer?.cancel();
    await realtime.pause();
  }

  Future<void> onConnectivityRegained() => syncNow();

  Future<void> _flush() async {
    final r = await engine.flush();
    _retryTimer?.cancel();
    final wait = r.retryIn;
    if (_active && wait != null && !r.paused) {
      _retryTimer = Timer(wait, () => unawaited(_flush()));
    }
  }

  void dispose() {
    _retryTimer?.cancel();
    unawaited(_pulling.close());
  }
}
