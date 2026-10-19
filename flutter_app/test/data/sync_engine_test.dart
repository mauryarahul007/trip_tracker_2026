import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/sync/outbox_remote.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/data/sync/supabase_outbox_remote.dart';
import 'package:trip_tracker/data/sync/sync_engine.dart';

class FakeRemote implements OutboxRemote {
  final executed = <String>[];
  final failures = <String, RemoteFailure>{}; // entityKey -> failure
  int failTimes = 1 << 30;

  @override
  Future<void> execute(OutboxItem item) async {
    final f = failures[item.entityKey];
    if (f != null && failTimes-- > 0) throw f;
    executed.add(item.id);
  }
}

void main() {
  late AppDatabase db;
  late OutboxStore store;
  late FakeRemote remote;
  late DateTime clock;
  var online = true;
  var session = true;

  SyncEngine engine() => SyncEngine(
    store: store,
    remote: remote,
    isOnline: () async => online,
    ensureSession: () async => session,
    now: () => clock,
  );

  setUp(() {
    db = AppDatabase.memory();
    clock = DateTime.utc(2026, 1, 1);
    store = OutboxStore(db, now: () => clock);
    remote = FakeRemote();
    online = true;
    session = true;
  });
  tearDown(() => db.close());

  Future<String> add(String type, String id, {String trip = 't1'}) => store.enqueue(type, {'id': id}, tripId: trip);

  test('flushes FIFO and clears the outbox', () async {
    final a = await add(OutboxType.updateMember, 'm1');
    final b = await add(OutboxType.updateMember, 'm2');
    final r = await engine().flush();
    expect(r.sent, 2);
    expect(remote.executed, [a, b]);
    expect(await store.all(), isEmpty);
  });

  test('offline pauses and keeps items; online later delivers', () async {
    await add(OutboxType.updateMember, 'm1');
    online = false;
    final e = engine();
    expect((await e.flush()).paused, isTrue);
    expect(await store.all(), hasLength(1));
    online = true;
    expect((await e.flush()).sent, 1);
  });

  test('expired session pauses without burning attempts', () async {
    await add(OutboxType.updateMember, 'm1');
    session = false;
    expect((await engine().flush()).paused, isTrue);
    expect((await store.all()).single.attempts, 0);
  });

  test('auth failure from remote releases item and pauses', () async {
    await add(OutboxType.updateMember, 'm1');
    remote.failures['m1'] = const RemoteFailure(FailureKind.auth, 'jwt');
    final r = await engine().flush();
    expect(r.paused, isTrue);
    final item = (await store.all()).single;
    expect(item.status, OutboxStatus.pending);
    expect(item.attempts, 0);
  });

  test('permanent failure quarantines but does not block other entities', () async {
    await add(OutboxType.updateMember, 'bad');
    final ok = await add(OutboxType.updateMember, 'good');
    remote.failures['bad'] = const RemoteFailure(FailureKind.permanent, 'rls');
    final r = await engine().flush();
    expect(r.poisoned, 1);
    expect(r.sent, 1);
    expect(remote.executed, [ok]);
    final issues = await store.watchIssues().first;
    expect(issues.single.payload['id'], 'bad');
  });

  test('later ops on a failed entity wait (per-entity FIFO)', () async {
    await add(OutboxType.updateMember, 'm1');
    await add(OutboxType.toggleArchiveMember, 'm1');
    remote.failures['m1'] = const RemoteFailure(FailureKind.transient, '503');
    final r = await engine().flush();
    expect(r.failed, 1);
    expect(remote.executed, isEmpty);
    expect(await store.all(), hasLength(2));
  });

  test('transient failure backs off, then retries after the delay', () async {
    await add(OutboxType.updateMember, 'm1');
    remote.failures['m1'] = const RemoteFailure(FailureKind.transient, '503');
    remote.failTimes = 1;
    final e = engine();
    final first = await e.flush();
    expect(first.failed, 1);
    expect(first.retryIn, isNotNull);

    // Too early: not attempted again.
    expect((await e.flush()).sent, 0);
    clock = clock.add(const Duration(minutes: 10));
    expect((await e.flush()).sent, 1);
    expect(await store.all(), isEmpty);
  });

  test('too many transient failures quarantine the item', () async {
    await add(OutboxType.updateMember, 'm1');
    remote.failures['m1'] = const RemoteFailure(FailureKind.transient, '503');
    final e = engine();
    for (var i = 0; i < 8; i++) {
      await e.flush();
      clock = clock.add(const Duration(minutes: 10));
    }
    expect((await store.all()).single.status, OutboxStatus.poison);
  });

  test('failed createTrip blocks its dependent children', () async {
    await store.enqueue(OutboxType.createTrip, {
      'trip': {'id': 't1'},
      'member': {'id': 'm1'},
    }, tripId: 't1');
    await add(OutboxType.addCategory, 'c1');
    remote.failures['t1'] = const RemoteFailure(FailureKind.permanent, 'bad');
    final r = await engine().flush();
    expect(r.poisoned, 1);
    expect(remote.executed, isEmpty);
  });

  test('interrupted in-flight items are recovered and resent', () async {
    final id = await add(OutboxType.updateMember, 'm1');
    await store.markInFlight(id); // simulate kill mid-send
    final r = await engine().flush();
    expect(r.sent, 1);
    expect(remote.executed, [id]);
  });

  test('concurrent flush calls are single-flight', () async {
    await add(OutboxType.updateMember, 'm1');
    final e = engine();
    await Future.wait([e.flush(), e.flush(), e.flush()]);
    expect(remote.executed, hasLength(1)); // no duplicate delivery
  });

  test('dirtyIds covers tempId, id, and quarantined items', () async {
    await store.enqueue(OutboxType.addExpense, {'tempId': 'e1'}, tripId: 't1');
    await add(OutboxType.deleteExpense, 'e2');
    expect(await store.dirtyIds(), {'e1', 'e2'});
  });

  test('retry resets a quarantined item; discard removes it', () async {
    final id = await add(OutboxType.updateMember, 'm1');
    final item = (await store.all()).single;
    await store.markFailed(item, 'x', quarantine: true);
    await store.retry(id);
    expect((await store.all()).single.status, OutboxStatus.pending);
    await store.discard(id);
    expect(await store.all(), isEmpty);
  });

  test('classifyPostgrest', () {
    expect(classifyPostgrest(const PostgrestException(message: 'x', code: '42501')).kind, FailureKind.permanent);
    expect(classifyPostgrest(const PostgrestException(message: 'x', code: '23505')).kind, FailureKind.permanent);
    expect(
      classifyPostgrest(const PostgrestException(message: 'JWT expired', code: 'PGRST301')).kind,
      FailureKind.auth,
    );
    expect(classifyPostgrest(const PostgrestException(message: 'x', code: '503')).kind, FailureKind.transient);
  });
}
