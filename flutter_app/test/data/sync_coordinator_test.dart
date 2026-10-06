import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/realtime/realtime_manager.dart';
import 'package:trip_tracker/data/realtime/realtime_source.dart';
import 'package:trip_tracker/data/sync/outbox_remote.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/data/sync/sync_coordinator.dart';
import 'package:trip_tracker/data/sync/sync_engine.dart';
import 'package:trip_tracker/data/sync/trip_pull_sync.dart';

final log = <String>[];

class _Remote implements OutboxRemote {
  @override
  Future<void> execute(OutboxItem item) async => log.add('push:${item.type}');
}

class _Reader extends TripRemoteReader {
  @override
  Future<List<String>> myTripIds() async {
    log.add('pull');
    return [];
  }

  @override
  Future<Map<String, dynamic>> tripChanges(String tripId, DateTime? since) async => {};
}

class _Source implements RealtimeSource {
  @override
  RealtimeHandle open(ChannelSpec spec, void Function(RealtimeEvent) e, void Function(ChannelStatus) s) => _H();
}

class _H implements RealtimeHandle {
  @override
  Future<void> close() async {}
}

void main() {
  test('syncNow pushes before it pulls; background pauses realtime', () async {
    log.clear();
    final db = AppDatabase.memory();
    final store = OutboxStore(db);
    await store.enqueue(OutboxType.deleteGroup, {'id': 'g1'}, tripId: 't1');
    final c = SyncCoordinator(
      engine: SyncEngine(store: store, remote: _Remote(), isOnline: () async => true, ensureSession: () async => true),
      pull: TripPullSync(db, store, _Reader()),
      realtime: RealtimeManager(source: _Source(), db: db, onResync: (_) async {}),
    );
    await c.syncNow();
    expect(log, ['push:deleteGroup', 'pull']);

    await c.realtime.openTrip('t1');
    await c.onBackground();
    expect(c.realtime.openChannels, isEmpty);
    await c.onForeground();
    expect(c.realtime.openChannels, hasLength(3));
    expect(log.last, 'pull');
    c.dispose();
    await db.close();
  });

  test('pull results are handed to onPulled (feeds the conflict store); pull still runs without a callback', () async {
    log.clear();
    final db = AppDatabase.memory();
    final store = OutboxStore(db);
    Map<String, PullResult>? got;
    final c = SyncCoordinator(
      engine: SyncEngine(store: store, remote: _Remote(), isOnline: () async => true, ensureSession: () async => true),
      pull: TripPullSync(db, store, _Reader()),
      realtime: RealtimeManager(source: _Source(), db: db, onResync: (_) async {}),
      onPulled: (r) => got = r,
    );
    await c.syncNow();
    expect(got, isNotNull);
    expect(log, ['pull']);
    c.dispose();
    await db.close();
  });

  test('offline sync does not pull-fail the app', () async {
    log.clear();
    final db = AppDatabase.memory();
    final store = OutboxStore(db);
    final c = SyncCoordinator(
      engine: SyncEngine(store: store, remote: _Remote(), isOnline: () async => false, ensureSession: () async => true),
      pull: TripPullSync(db, store, _ThrowingReader()),
      realtime: RealtimeManager(source: _Source(), db: db, onResync: (_) async {}),
    );
    await c.syncNow(); // must not throw
    c.dispose();
    await db.close();
  });
}

class _ThrowingReader extends TripRemoteReader {
  @override
  Future<List<String>> myTripIds() async => throw Exception('offline');
  @override
  Future<Map<String, dynamic>> tripChanges(String tripId, DateTime? since) async => {};
}
