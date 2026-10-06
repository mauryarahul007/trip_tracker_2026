import 'dart:async';

import '../../core/logging/app_logger.dart';
import '../realtime/realtime_manager.dart';
import 'sync_engine.dart';
import 'trip_pull_sync.dart';

/// Decides *when* to sync: push first (so the server has our edits), then
/// pull, then (re)open realtime. Triggers: app start, foreground,
/// connectivity regained, after enqueue, and the engine's own backoff timer.
class SyncCoordinator {
  SyncCoordinator({required this.engine, required this.pull, required this.realtime, this.onPulled});

  final SyncEngine engine;
  final TripPullSync pull;
  final RealtimeManager realtime;

  /// Called with every pull's per-trip result (conflicts, etc.).
  final void Function(Map<String, PullResult> results)? onPulled;

  Timer? _retryTimer;
  bool _active = true;

  /// Called by repositories after every local write.
  void requestFlush() => unawaited(_flush());

  Future<void> start() => syncNow();

  Future<void> syncNow() async {
    await _flush();
    try {
      // Await first: `onPulled?.call(await ...)` would skip the pull when no callback is set.
      final results = await pull.syncAll();
      onPulled?.call(results);
    } catch (e) {
      AppLogger.warn('Pull sync failed: $e');
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

  void dispose() => _retryTimer?.cancel();
}
