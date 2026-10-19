import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:drift/drift.dart';

import '../../core/logging/app_logger.dart';
import '../mappers/row_mappers.dart';
import '../local/app_database.dart';
import 'realtime_source.dart';

/// Owns realtime channel lifecycle (API_CONTRACT §5, SYNC.md):
///  - one active trip at a time: opening a trip closes the previous trip's channels
///  - `pause()` on background, `resume()` on foreground
///  - channel error/close -> resubscribe with exponential backoff
///  - every SUBSCRIBED (first or re-) triggers [onResync] so missed events are
///    recovered by a delta sync, never by trusting the socket
///  - events go into local storage / resync, never straight to the UI
class RealtimeManager {
  RealtimeManager({
    required this.source,
    required this.db,
    required this.onResync,
    Future<void> Function(Duration)? delay,
    this.baseBackoff = const Duration(seconds: 1),
    this.maxBackoff = const Duration(seconds: 60),
  }) : _delay = delay ?? Future<void>.delayed;

  final RealtimeSource source;
  final AppDatabase db;

  /// Delta-sync a trip (coalesced by this manager).
  final Future<void> Function(String tripId) onResync;
  final Duration baseBackoff;
  final Duration maxBackoff;
  final Future<void> Function(Duration) _delay;

  final _readCursors = StreamController<RealtimeEvent>.broadcast();

  /// Raw `trip_chat_read_cursors` events for the unread/read-receipt UI.
  Stream<RealtimeEvent> get readCursorEvents => _readCursors.stream;

  String? _tripId;
  String? _userId;
  bool _paused = false;
  final _handles = <String, RealtimeHandle>{};
  final _attempts = <String, int>{};
  final _generation = <String, int>{};
  final _specs = <String, ChannelSpec>{};

  bool _resyncing = false;
  bool _resyncAgain = false;

  List<String> get openChannels => _handles.keys.toList()..sort();

  Future<void> openTrip(String tripId) async {
    if (_tripId == tripId) return;
    await _closeTripChannels();
    _tripId = tripId;
    for (final spec in _tripSpecs(tripId)) {
      _specs[spec.name] = spec;
    }
    if (!_paused) _openAll(_tripSpecs(tripId));
  }

  Future<void> closeTrip() async {
    await _closeTripChannels();
    _tripId = null;
  }

  Future<void> watchNotifications(String userId) async {
    if (_userId == userId) return;
    await _close('notifications:$_userId');
    _userId = userId;
    final spec = ChannelSpec('notifications:$userId', [
      PgSub('INSERT', 'notifications', filterColumn: 'user_id', filterValue: userId),
    ]);
    _specs[spec.name] = spec;
    if (!_paused) _open(spec);
  }

  /// App backgrounded: drop sockets (mobile OSes kill them anyway).
  Future<void> pause() async {
    _paused = true;
    for (final name in _handles.keys.toList()) {
      await _close(name, forget: false);
    }
  }

  /// App foregrounded: reopen; each SUBSCRIBED triggers a delta sync.
  void resume() {
    if (!_paused) return;
    _paused = false;
    _openAll(_specs.values.toList());
  }

  Future<void> dispose() async {
    for (final name in _handles.keys.toList()) {
      await _close(name);
    }
    await _readCursors.close();
  }

  List<ChannelSpec> _tripSpecs(String t) => [
    ChannelSpec('trip_collab:$t', [
      PgSub('INSERT', 'trip_collab_signals', filterColumn: 'trip_id', filterValue: t),
      PgSub('UPDATE', 'trip_collab_signals', filterColumn: 'trip_id', filterValue: t),
      PgSub('UPDATE', 'trips', filterColumn: 'id', filterValue: t),
    ]),
    ChannelSpec('trip_messages:$t', [
      PgSub('INSERT', 'trip_messages', filterColumn: 'trip_id', filterValue: t),
      PgSub('UPDATE', 'trip_messages', filterColumn: 'trip_id', filterValue: t),
    ]),
    ChannelSpec('trip_chat_read_cursors:$t', [
      PgSub('*', 'trip_chat_read_cursors', filterColumn: 'trip_id', filterValue: t),
    ]),
  ];

  void _openAll(List<ChannelSpec> specs) {
    for (final s in specs) {
      _open(s);
    }
  }

  void _open(ChannelSpec spec) {
    final gen = (_generation[spec.name] ?? 0) + 1;
    _generation[spec.name] = gen;
    _handles[spec.name]?.close();
    _handles[spec.name] = source.open(
      spec,
      (e) {
        if (_generation[spec.name] == gen) _onEvent(e);
      },
      (s) {
        if (_generation[spec.name] == gen) _onStatus(spec, s);
      },
    );
  }

  Future<void> _close(String name, {bool forget = true}) async {
    _generation[name] = (_generation[name] ?? 0) + 1; // invalidate callbacks
    final h = _handles.remove(name);
    if (forget) {
      _specs.remove(name);
      _attempts.remove(name);
    }
    await h?.close();
  }

  Future<void> _closeTripChannels() async {
    final t = _tripId;
    if (t == null) return;
    for (final s in _tripSpecs(t)) {
      await _close(s.name);
    }
  }

  void _onStatus(ChannelSpec spec, ChannelStatus status) {
    switch (status) {
      case ChannelStatus.subscribed:
        _attempts[spec.name] = 0;
        final trip = _tripId;
        if (trip != null && spec.name.endsWith(':$trip') && !spec.name.startsWith('trip_chat_read')) {
          unawaited(_resync(trip));
        }
      case ChannelStatus.closed:
      case ChannelStatus.error:
        unawaited(_retry(spec));
    }
  }

  Future<void> _retry(ChannelSpec spec) async {
    if (_paused || !_specs.containsKey(spec.name)) return;
    final gen = _generation[spec.name];
    final n = (_attempts[spec.name] ?? 0) + 1;
    _attempts[spec.name] = n;
    final wait = baseBackoff * pow(2, n - 1).toInt();
    await _delay(wait > maxBackoff ? maxBackoff : wait);
    // Skip if the channel was closed/replaced/paused while waiting.
    if (_paused || _generation[spec.name] != gen || !_specs.containsKey(spec.name)) return;
    AppLogger.info('Realtime resubscribing ${spec.name} (attempt $n)');
    _open(spec);
  }

  /// Single-flight with one trailing rerun, so an event burst = <=2 syncs.
  Future<void> _resync(String tripId) async {
    if (_resyncing) {
      _resyncAgain = true;
      return;
    }
    _resyncing = true;
    try {
      do {
        _resyncAgain = false;
        try {
          await onResync(tripId);
        } catch (e) {
          AppLogger.warn('Realtime resync failed: $e');
        }
      } while (_resyncAgain);
    } finally {
      _resyncing = false;
    }
  }

  void _onEvent(RealtimeEvent e) {
    switch (e.table) {
      case 'trip_collab_signals':
      case 'trips':
        final t = _tripId;
        if (t != null) unawaited(_resync(t));
      case 'trip_messages':
        unawaited(_ingestMessage(e.record));
      case 'notifications':
        unawaited(_ingestNotification(e.record));
      case 'trip_chat_read_cursors':
        _readCursors.add(e);
    }
  }

  Future<void> _ingestMessage(Map<String, dynamic> r) async {
    if (r['id'] == null) return;
    final m = messageFromRow(r);
    await db
        .into(db.tripMessagesTable)
        .insertOnConflictUpdate(
          TripMessagesTableCompanion.insert(
            id: m.id,
            tripId: m.tripId,
            userId: m.memberId,
            senderName: '',
            kind: m.eventKind ?? 'text',
            message: m.body,
            createdAt: DateTime.fromMillisecondsSinceEpoch(m.createdAt, isUtc: true).toIso8601String(),
            domainJson: Value(jsonEncode(m.toJson())),
          ),
        );
  }

  Future<void> _ingestNotification(Map<String, dynamic> r) async {
    if (r['id'] == null) return;
    await db
        .into(db.notificationsTable)
        .insertOnConflictUpdate(
          NotificationsTableCompanion.insert(
            id: r['id'] as String,
            userId: r['user_id'] as String? ?? _userId ?? '',
            tripId: Value(r['trip_id'] as String?),
            title: r['title'] as String? ?? '',
            body: r['body'] as String? ?? '',
            dataJson: Value(r['data'] == null ? null : jsonEncode(r['data'])),
            read: Value(r['read'] == true),
            createdAt: r['created_at'] as String? ?? DateTime.now().toUtc().toIso8601String(),
          ),
        );
  }
}
