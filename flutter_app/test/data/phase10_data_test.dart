import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/core/flags/flag_overrides.dart';
import 'package:trip_tracker/core/logging/app_logger.dart';
import 'package:trip_tracker/core/platform/push_gateway.dart';
import 'package:trip_tracker/data/backup/backup_service.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/push/push_service.dart';
import 'package:trip_tracker/data/repositories/drift_repositories.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/domain/logic/expense_form_logic.dart';

import '../support/fakes.dart';

void main() {
  group('BackupService round trip', () {
    late AppDatabase db;
    late DriftTripRepository trips;
    late DriftMemberRepository members;
    late DriftExpenseRepository expenses;

    BackupService svc() => BackupService(trips, members, expenses);

    setUp(() {
      db = AppDatabase.memory();
      final outbox = OutboxStore(db);
      trips = DriftTripRepository(db, outbox, () {});
      members = DriftMemberRepository(db, outbox, () {});
      expenses = DriftExpenseRepository(db, outbox, () {});
    });
    tearDown(() => db.close());

    test('export on one device, restore on a fresh one reproduces trips, people and money', () async {
      final id = await trips.createTrip(
        name: 'Goa',
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        baseCurrency: 'INR',
        ownerId: 'u1',
        creatorName: 'Asha',
        destination: 'Goa',
      );
      final asha = (await members.watchMembers(id).first).single.id;
      final ben = await members.addMember(id, 'Ben');
      final cara = await members.addMember(id, 'Cara');
      await members.setArchived(cara, true);
      final r = await expenses.submit(
        ExpenseSubmission(
          title: 'Dinner',
          amount: 900,
          currency: 'INR',
          category: 'cat-food',
          date: '2026-12-02',
          paidBy: asha,
          splitMode: 'equal',
          splitMemberIds: [asha, ben],
        ),
        tripId: id,
        userId: 'u1',
      );
      expect(r.isOk, isTrue);
      final json = await svc().exportJson(now: DateTime.utc(2026, 10, 6));
      expect(json, contains('"type": "full_backup"'));

      // Fresh install: new database, signed in as the same person.
      final db2 = AppDatabase.memory();
      addTearDown(db2.close);
      final o2 = OutboxStore(db2);
      final t2 = DriftTripRepository(db2, o2, () {});
      final m2 = DriftMemberRepository(db2, o2, () {});
      final e2 = DriftExpenseRepository(db2, o2, () {});
      final res = await BackupService(t2, m2, e2).restore(json, userId: 'u1', userName: 'Asha');

      expect(res.ok, isTrue);
      expect(res.trips, 1);
      expect(res.expenses, 1);
      final newTrip = (await t2.watchTrips().first).single;
      expect(newTrip.id, isNot(id)); // new ids, by design
      expect(newTrip.name, 'Goa');
      expect(newTrip.baseCurrency, 'INR');
      final people = await m2.watchMembers(newTrip.id).first;
      expect(people.map((m) => m.name).toSet(), {'Asha', 'Ben', 'Cara'});
      expect(people.firstWhere((m) => m.name == 'Cara').archived, isTrue);
      final exp = (await e2.watchActive(newTrip.id).first).single;
      expect(exp.title, 'Dinner');
      expect(exp.amount, 900);
      final byName = {for (final m in people) m.id: m.name};
      expect(byName[exp.paidBy], 'Asha');
      expect(exp.splitMemberIds.map((i) => byName[i]).toSet(), {'Asha', 'Ben'});
      expect(exp.resolvedShares.values.fold<double>(0, (a, b) => a + b), closeTo(900, 0.01));
    });

    test('restores a web/Capacitor export (members as a map, trips list memberIds)', () async {
      const web = '''
{
  "trips": [{"id": "t1", "name": "Manali", "startDate": "2026-05-01", "endDate": "2026-05-04", "baseCurrency": "INR",
             "memberIds": ["m1", "m2", "m3"], "groupIds": []}],
  "activeTripId": "t1",
  "members": {
    "m1": {"id": "m1", "name": "Rahul"},
    "m2": {"id": "m2", "name": "Isha", "linkedUserId": "u9"},
    "m3": {"id": "m3", "name": "Old friend", "archived": true}
  },
  "groups": {},
  "expenses": [
    {"id": "e1", "tripId": "t1", "title": "Cab", "amount": 600, "currency": "INR", "category": "cat-travel", "date": "2026-05-01",
     "paidBy": "m2", "splitMode": "equal", "splitMemberIds": ["m1", "m2"], "resolvedShares": {"m1": 300, "m2": 300},
     "isSettlement": false, "createdAt": 1, "updatedAt": 1},
    {"id": "e2", "tripId": "t1", "title": "Binned", "amount": 50, "currency": "INR", "category": "cat-misc", "date": "2026-05-02",
     "paidBy": "m1", "splitMode": "equal", "splitMemberIds": ["m1"], "resolvedShares": {"m1": 50},
     "isSettlement": false, "deletedAt": 5, "createdAt": 1, "updatedAt": 1}
  ],
  "categories": []
}''';
      final res = await svc().restore(web, userId: 'u1', userName: 'Rahul');
      expect(res.ok, isTrue);
      expect(res.trips, 1);
      expect(res.expenses, 1); // the recycle-bin item is not restored
      final trip = (await trips.watchTrips().first).single;
      final people = await members.watchMembers(trip.id).first;
      expect(people.map((m) => m.name).toSet(), {
        'Rahul',
        'Isha',
        'Old friend',
      }); // owner matched by name, not duplicated
      expect(people.firstWhere((m) => m.name == 'Old friend').archived, isTrue);
      final e = (await expenses.watchActive(trip.id).first).single;
      final byName = {for (final m in people) m.id: m.name};
      expect(byName[e.paidBy], 'Isha');
      expect(e.resolvedShares.keys.map((k) => byName[k]).toSet(), {'Rahul', 'Isha'});
    });

    test('rejects invalid files without touching data', () async {
      expect((await svc().restore('not json', userId: 'u1', userName: 'A')).ok, isFalse);
      expect((await svc().restore('{"trips": "x"}', userId: 'u1', userName: 'A')).ok, isFalse);
      expect(await trips.watchTrips().first, isEmpty);
    });
  });

  group('PushService', () {
    test('registers the token and re-registers on rotation, only when permission is granted', () async {
      final gw = FakePushGateway()..perm = PushPermission.denied;
      final be = FakePushTokenBackend();
      final svc = PushService(gw, be, () async => '3.45.0');
      await svc.register();
      expect(be.registered, isEmpty);

      gw.perm = PushPermission.granted;
      await svc.register();
      expect(be.registered, ['fcm-token-1|android|3.45.0']);
      gw.refresh.add('fcm-token-2');
      await Future<void>.delayed(Duration.zero);
      expect(be.registered.last, 'fcm-token-2|android|3.45.0');
    });

    test('sign-out removes this device row and the FCM token; stops listening for rotation', () async {
      final gw = FakePushGateway()..perm = PushPermission.granted;
      final be = FakePushTokenBackend();
      final svc = PushService(gw, be, () async => '1.0.0');
      await svc.register();
      await svc.unregister('u1');
      expect(be.removed, ['u1|fcm-token-1']);
      expect(gw.tokenDeleted, isTrue);
      gw.refresh.add('late');
      await Future<void>.delayed(Duration.zero);
      expect(be.registered, hasLength(1));
    });

    test('no Firebase config: nothing registered, no throw', () async {
      final gw = FakePushGateway()..available = false;
      final be = FakePushTokenBackend();
      await PushService(gw, be, () async => '1').register();
      expect(be.registered, isEmpty);
    });
  });

  group('OverridableFlagsRepository', () {
    test('override beats the server value, clearing falls back, changes stream through', () async {
      SharedPreferences.setMockInitialValues({});
      final store = FlagOverrideStore(await SharedPreferences.getInstance());
      final repo = OverridableFlagsRepository(FakeFlags({'enableQuietHours'}), store);
      final seen = <bool>[];
      final sub = repo.watch('enableQuietHours').listen(seen.add);
      await Future<void>.delayed(Duration.zero);
      await store.set('enableQuietHours', false);
      await Future<void>.delayed(Duration.zero);
      await store.set('enableQuietHours', null);
      await Future<void>.delayed(Duration.zero);
      expect(seen, [true, false, true]);
      await sub.cancel();
    });

    test('overrides persist across store instances and reset', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await FlagOverrideStore(prefs).set('enableAmoledTheme', true);
      final again = FlagOverrideStore(prefs);
      expect(again.all, {'enableAmoledTheme': true});
      await again.clear();
      expect(FlagOverrideStore(prefs).all, isEmpty);
    });
  });

  test('AppLogger keeps a scrubbed ring buffer for bug reports', () {
    AppLogger.info('login ok for someone@example.com token Bearer abcdefghijklmnop1234');
    final last = AppLogger.recent.last;
    expect(last, contains('login ok'));
    expect(last, isNot(contains('someone@example.com')));
    expect(last, isNot(contains('abcdefghijklmnop')));
    for (var i = 0; i < 300; i++) {
      AppLogger.debug('line $i');
    }
    expect(AppLogger.recent.length, lessThanOrEqualTo(200));
  });
}
