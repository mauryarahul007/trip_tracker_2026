import 'dart:async';
import 'dart:math';

import '../../core/logging/app_logger.dart';
import 'outbox_remote.dart';
import 'outbox_store.dart';
import 'outbox_types.dart';

class FlushResult {
  final int sent;
  final int failed;
  final int poisoned;
  final bool paused;
  final Duration? retryIn;
  const FlushResult({this.sent = 0, this.failed = 0, this.poisoned = 0, this.paused = false, this.retryIn});
  static const idle = FlushResult();
}

/// Single-flight outbox processor (SYNC.md §2).
///
/// FIFO per entity, other entities proceed past a failed one. Transient
/// failures back off exponentially with jitter; permanent failures (and too
/// many transient ones) quarantine the item without blocking the queue.
/// Offline or expired auth pauses without discarding or burning attempts.
class SyncEngine {
  SyncEngine({
    required this.store,
    required this.remote,
    required this.isOnline,
    required this.ensureSession,
    this.maxAttempts = 8,
    this.baseDelay = const Duration(seconds: 2),
    this.maxDelay = const Duration(minutes: 5),
    DateTime Function()? now,
    Random? random,
  }) : _now = now ?? DateTime.now,
       _random = random ?? Random();

  final OutboxStore store;
  final OutboxRemote remote;
  final Future<bool> Function() isOnline;

  /// Returns false when the session could not be refreshed (expired).
  final Future<bool> Function() ensureSession;
  final int maxAttempts;
  final Duration baseDelay;
  final Duration maxDelay;
  final DateTime Function() _now;
  final Random _random;

  Future<FlushResult>? _running;
  bool _rerun = false;
  final _events = StreamController<FlushResult>.broadcast();

  /// Emits after every flush; powers the sync inspector / "sync issue" UI.
  Stream<FlushResult> get results => _events.stream;

  Duration backoff(int attempts) {
    final exp = baseDelay * pow(2, max(0, attempts - 1)).toInt();
    final capped = exp > maxDelay ? maxDelay : exp;
    // +/-25% jitter
    return capped * (0.75 + _random.nextDouble() * 0.5);
  }

  /// Triggers a flush. Calls during a flush coalesce into one extra pass.
  Future<FlushResult> flush() {
    final running = _running;
    if (running != null) {
      _rerun = true;
      return running;
    }
    return _running = _loop().whenComplete(() => _running = null);
  }

  Future<FlushResult> _loop() async {
    var total = FlushResult.idle;
    do {
      _rerun = false;
      final r = await _pass();
      total = FlushResult(
        sent: total.sent + r.sent,
        failed: total.failed + r.failed,
        poisoned: total.poisoned + r.poisoned,
        paused: r.paused,
        retryIn: r.retryIn,
      );
      if (r.paused) break;
    } while (_rerun);
    _events.add(total);
    return total;
  }

  Future<FlushResult> _pass() async {
    if (!await isOnline()) return const FlushResult(paused: true);
    await store.recoverInterrupted();
    final items = await store.all();
    if (items.isEmpty) return FlushResult.idle;
    if (!await ensureSession()) {
      AppLogger.warn('Sync paused: session expired');
      return const FlushResult(paused: true);
    }

    var sent = 0, failed = 0, poisoned = 0;
    Duration? retryIn;
    final blocked = <String>{};
    final blockedTrips = <String>{};

    for (final item in items) {
      if (item.status == OutboxStatus.poison) {
        blocked.add(item.entityKey);
        if (item.type == OutboxType.createTrip && item.tripId != null) blockedTrips.add(item.tripId!);
        continue;
      }
      if (blocked.contains(item.entityKey) || (item.tripId != null && blockedTrips.contains(item.tripId))) continue;

      if (item.status == OutboxStatus.failed && item.lastAttemptedAt != null) {
        final due = item.lastAttemptedAt!.add(backoff(item.attempts));
        final wait = due.difference(_now());
        if (wait > Duration.zero) {
          blocked.add(item.entityKey);
          if (retryIn == null || wait < retryIn) retryIn = wait;
          continue;
        }
      }

      await store.markInFlight(item.id);
      try {
        await remote.execute(item);
        await store.markDone(item.id);
        sent++;
      } on RemoteFailure catch (f) {
        if (f.kind == FailureKind.auth) {
          await store.release(item.id);
          return FlushResult(sent: sent, failed: failed, poisoned: poisoned, paused: true);
        }
        final quarantine = f.kind == FailureKind.permanent || item.attempts + 1 >= maxAttempts;
        await store.markFailed(item, f.message, quarantine: quarantine);
        blocked.add(item.entityKey);
        if (quarantine) {
          poisoned++;
          if (item.type == OutboxType.createTrip && item.tripId != null) blockedTrips.add(item.tripId!);
          AppLogger.warn('Outbox ${item.type} ${item.id} quarantined: ${f.message}');
        } else {
          failed++;
          final d = backoff(item.attempts + 1);
          if (retryIn == null || d < retryIn) retryIn = d;
        }
      } catch (e) {
        // Unclassified (socket drop, timeout): treat as transient.
        await store.markFailed(item, '$e', quarantine: item.attempts + 1 >= maxAttempts);
        blocked.add(item.entityKey);
        failed++;
        final d = backoff(item.attempts + 1);
        if (retryIn == null || d < retryIn) retryIn = d;
      }
    }
    return FlushResult(sent: sent, failed: failed, poisoned: poisoned, retryIn: retryIn);
  }

  void dispose() => _events.close();
}
