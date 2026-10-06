import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/realtime/realtime_manager.dart';
import 'package:trip_tracker/data/realtime/realtime_source.dart';

class FakeHandle implements RealtimeHandle {
  FakeHandle(this.spec, this.onEvent, this.onStatus);
  final ChannelSpec spec;
  final void Function(RealtimeEvent) onEvent;
  final void Function(ChannelStatus) onStatus;
  bool closed = false;
  @override
  Future<void> close() async => closed = true;
}

class FakeSource implements RealtimeSource {
  final opened = <FakeHandle>[];
  List<FakeHandle> live(String name) => opened.where((h) => h.spec.name == name && !h.closed).toList();

  @override
  RealtimeHandle open(ChannelSpec spec, void Function(RealtimeEvent) onEvent, void Function(ChannelStatus) onStatus) {
    final h = FakeHandle(spec, onEvent, onStatus);
    opened.add(h);
    return h;
  }
}

void main() {
  late AppDatabase db;
  late FakeSource source;
  late RealtimeManager mgr;
  late List<String> resyncs;
  late List<Duration> delays;
  Completer<void>? gate;

  setUp(() {
    db = AppDatabase.memory();
    source = FakeSource();
    resyncs = [];
    delays = [];
    gate = null;
    mgr = RealtimeManager(
      source: source,
      db: db,
      onResync: (t) async {
        resyncs.add(t);
        await gate?.future;
      },
      delay: (d) async => delays.add(d),
    );
  });
  tearDown(() => db.close());

  test('openTrip opens the three trip channels; switching trips closes the old ones (BUG-146)', () async {
    await mgr.openTrip('a');
    expect(mgr.openChannels, ['trip_chat_read_cursors:a', 'trip_collab:a', 'trip_messages:a']);
    await mgr.openTrip('b');
    expect(mgr.openChannels, ['trip_chat_read_cursors:b', 'trip_collab:b', 'trip_messages:b']);
    expect(source.live('trip_collab:a'), isEmpty);
    expect(source.live('trip_collab:b'), hasLength(1));
  });

  test('re-opening the same trip does not duplicate channels', () async {
    await mgr.openTrip('a');
    await mgr.openTrip('a');
    expect(source.opened, hasLength(3));
  });

  test('SUBSCRIBED triggers a delta resync', () async {
    await mgr.openTrip('a');
    source.live('trip_collab:a').single.onStatus(ChannelStatus.subscribed);
    await Future<void>.delayed(Duration.zero);
    expect(resyncs, ['a']);
  });

  test('error resubscribes with exponential backoff and resyncs after reconnect', () async {
    await mgr.openTrip('a');
    for (var i = 0; i < 3; i++) {
      source.live('trip_collab:a').single.onStatus(ChannelStatus.error);
      await Future<void>.delayed(Duration.zero);
    }
    expect(delays, [const Duration(seconds: 1), const Duration(seconds: 2), const Duration(seconds: 4)]);
    expect(source.opened.where((h) => h.spec.name == 'trip_collab:a'), hasLength(4));
    source.live('trip_collab:a').single.onStatus(ChannelStatus.subscribed);
    await Future<void>.delayed(Duration.zero);
    expect(resyncs, ['a']);
  });

  test('stale callbacks from a replaced channel are ignored', () async {
    await mgr.openTrip('a');
    final old = source.live('trip_collab:a').single;
    old.onStatus(ChannelStatus.error);
    await Future<void>.delayed(Duration.zero);
    old.onEvent(const RealtimeEvent('trip_collab:a', 'trips', 'UPDATE', {'id': 'a'}));
    await Future<void>.delayed(Duration.zero);
    expect(resyncs, isEmpty);
  });

  test('event burst coalesces into at most two resyncs', () async {
    await mgr.openTrip('a');
    gate = Completer<void>();
    final h = source.live('trip_collab:a').single;
    for (var i = 0; i < 10; i++) {
      h.onEvent(const RealtimeEvent('trip_collab:a', 'trip_collab_signals', 'UPDATE', {}));
    }
    await Future<void>.delayed(Duration.zero);
    gate!.complete();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    expect(resyncs.length, 2);
  });

  test('pause closes everything; resume reopens and resyncs', () async {
    await mgr.openTrip('a');
    await mgr.pause();
    expect(mgr.openChannels, isEmpty);
    expect(source.opened.every((h) => h.closed), isTrue);
    mgr.resume();
    expect(mgr.openChannels, hasLength(3));
    source.live('trip_collab:a').single.onStatus(ChannelStatus.subscribed);
    await Future<void>.delayed(Duration.zero);
    expect(resyncs, ['a']);
  });

  test('closed channel while paused does not retry', () async {
    await mgr.openTrip('a');
    final h = source.live('trip_collab:a').single;
    await mgr.pause();
    h.onStatus(ChannelStatus.closed);
    await Future<void>.delayed(Duration.zero);
    expect(delays, isEmpty);
  });

  test('message and notification events are persisted locally', () async {
    await mgr.openTrip('a');
    await mgr.watchNotifications('u1');
    source.live('trip_messages:a').single.onEvent(const RealtimeEvent('trip_messages:a', 'trip_messages', 'INSERT', {
      'id': 'msg1', 'trip_id': 'a', 'member_id': 'm1', 'body': 'hi', 'kind': 'text', 'created_at': '2026-01-01T00:00:00Z',
    }));
    source.live('notifications:u1').single.onEvent(const RealtimeEvent('notifications:u1', 'notifications', 'INSERT', {
      'id': 'n1', 'user_id': 'u1', 'trip_id': 'a', 'title': 'T', 'body': 'B', 'read': false, 'created_at': '2026-01-01T00:00:00Z',
    }));
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect((await db.select(db.tripMessagesTable).get()).single.message, 'hi');
    expect((await db.select(db.notificationsTable).get()).single.title, 'T');
  });

  test('read cursor events are forwarded, not stored', () async {
    await mgr.openTrip('a');
    final got = mgr.readCursorEvents.first;
    source.live('trip_chat_read_cursors:a').single.onEvent(
        const RealtimeEvent('trip_chat_read_cursors:a', 'trip_chat_read_cursors', 'UPDATE', {'member_id': 'm1'}));
    expect((await got).record['member_id'], 'm1');
  });
}
