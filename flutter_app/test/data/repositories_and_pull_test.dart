import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/repositories/drift_repositories.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/data/sync/trip_pull_sync.dart';
import 'package:trip_tracker/domain/models/expense.dart';

class FakeReader extends TripRemoteReader {
  List<String> ids = [];
  final responses = <String, Map<String, dynamic>>{};
  final sinceCalls = <DateTime?>[];

  List<Map<String, dynamic>> recycled = [];

  @override
  Future<List<Map<String, dynamic>>> recycledExpenses(String tripId) async => recycled;

  @override
  Future<List<String>> myTripIds() async => ids;

  @override
  Future<Map<String, dynamic>> tripChanges(String tripId, DateTime? since) async {
    sinceCalls.add(since);
    return responses[tripId]!;
  }
}

Map<String, dynamic> tripRow(String id) => {
      'id': id, 'name': 'Goa', 'start_date': '2026-01-01', 'end_date': '2026-01-05',
      'base_currency': 'INR', 'owner_id': 'u1', 'join_code': 'ABC123',
      'created_at': '2026-01-01T00:00:00Z', 'updated_at': '2026-01-01T00:00:00Z',
    };

Map<String, dynamic> expRow(String id, {double amount = 100, String? deletedAt}) => {
      'id': id, 'trip_id': 't1', 'title': 'Dinner', 'amount': amount, 'currency': 'INR',
      'category': 'Food', 'date': '2026-01-02', 'paid_by': 'm1', 'split_mode': 'equal',
      'split_member_ids': ['m1', 'm2'], 'resolved_shares': {'m1': 50, 'm2': 50},
      'is_settlement': false, 'created_at': '2026-01-02T00:00:00Z', 'updated_at': '2026-01-02T00:00:00Z',
    };

Map<String, dynamic> changes({Map<String, dynamic>? trip, List<Map<String, dynamic>> expenses = const [], List<String> tombstones = const [], String time = '2026-01-03T00:00:00Z'}) => {
      'server_time': time,
      'trip': trip,
      'members': [
        {'id': 'm1', 'trip_id': 't1', 'name': 'Asha', 'archived': false},
        {'id': 'm2', 'trip_id': 't1', 'name': 'Ben', 'archived': false},
      ],
      'groups': [{'id': 'g1', 'trip_id': 't1', 'name': 'Asha & Ben'}],
      'group_members': [
        {'group_id': 'g1', 'member_id': 'm1'},
        {'group_id': 'g1', 'member_id': 'm2'},
      ],
      'categories': [{'id': 'c1', 'trip_id': 't1', 'name': 'Snacks', 'is_custom': true}],
      'expenses': expenses,
      'tombstones': {'expenses': tombstones},
    };

Expense localExpense(String id, {double amount = 10}) => Expense(
      id: id, tripId: 't1', title: 'Lunch', amount: amount, currency: 'INR', category: 'Food',
      date: '2026-01-02', paidBy: 'm1', splitMode: 'equal', splitMemberIds: const ['m1', 'm2'],
      resolvedShares: const {'m1': 5, 'm2': 5}, createdAt: 0, updatedAt: 0,
    );

void main() {
  late AppDatabase db;
  late OutboxStore outbox;
  late FakeReader reader;
  late TripPullSync pull;
  late DriftExpenseRepository expenses;
  late DriftMemberRepository members;
  late DriftTripRepository trips;
  late DriftCategoryRepository cats;
  var syncRequests = 0;

  setUp(() {
    db = AppDatabase.memory();
    outbox = OutboxStore(db);
    reader = FakeReader();
    pull = TripPullSync(db, outbox, reader);
    void req() => syncRequests++;
    expenses = DriftExpenseRepository(db, outbox, req);
    members = DriftMemberRepository(db, outbox, req);
    trips = DriftTripRepository(db, outbox, req);
    cats = DriftCategoryRepository(db, outbox, req);
    syncRequests = 0;
  });
  tearDown(() => db.close());

  group('repositories (optimistic local write + outbox)', () {
    test('createTrip writes trip + owner member and enqueues one createTrip', () async {
      final id = await trips.createTrip(
          name: 'Goa', startDate: '2026-01-01', endDate: '2026-01-05', baseCurrency: 'INR', ownerId: 'u1', creatorName: 'Asha');
      final trip = await trips.watchTrip(id).first;
      expect(trip!.name, 'Goa');
      expect(trip.memberIds, hasLength(1));
      final q = await outbox.all();
      expect(q.single.type, OutboxType.createTrip);
      expect(q.single.tripId, id);
      expect(syncRequests, 1);
    });

    test('expense add -> edit -> delete -> restore, offline', () async {
      await expenses.add(localExpense('e1'));
      expect((await expenses.watchActive('t1').first).single.amount, 10);
      await expenses.update(localExpense('e1', amount: 20));
      expect((await expenses.watchActive('t1').first).single.amount, 20);
      await expenses.delete('e1', userId: 'u1');
      expect(await expenses.watchActive('t1').first, isEmpty);
      expect((await expenses.watchRecycled('t1').first).single.id, 'e1');
      await expenses.restore('e1');
      expect((await expenses.watchActive('t1').first).single.deletedAt, isNull);
      expect((await outbox.all()).map((i) => i.type), [
        OutboxType.addExpense, OutboxType.updateExpense, OutboxType.deleteExpense, OutboxType.restoreExpense,
      ]);
    });

    test('upsert args carry the real RPC parameter names', () async {
      await expenses.add(localExpense('e1'));
      final args = (await outbox.all()).single.payload['args'] as Map;
      expect(args['p_id'], 'e1');
      expect(args['p_split_member_ids'], ['m1', 'm2']);
      expect(args['p_paid_by'], 'm1');
    });

    test('permanent delete and empty bin remove local rows', () async {
      await expenses.add(localExpense('e1'));
      await expenses.add(localExpense('e2'));
      await expenses.delete('e1', userId: 'u1');
      await expenses.emptyRecycleBin('t1');
      expect(await expenses.watchRecycled('t1').first, isEmpty);
      await expenses.permanentlyDelete('e2');
      expect(await expenses.watchActive('t1').first, isEmpty);
    });

    test('deleteMember dissolves small groups, renames auto-named ones', () async {
      reader.ids = ['t1'];
      reader.responses['t1'] = changes(trip: tripRow('t1'));
      await pull.syncAll();
      final m3 = await members.addMember('t1', 'Cara');
      await members.updateGroup('g1', 'Asha & Ben', ['m1', 'm2']); // auto-named
      final g2 = await members.createGroup('t1', 'Goa Squad', ['m1', m3]); // custom-named
      await members.deleteMember('m2');
      final groups = await members.watchGroups('t1').first;
      expect(groups.map((g) => g.id), [g2]); // g1 left with 1 member -> dissolved
      final payload = (await outbox.all()).last.payload;
      expect(payload['groupsToDissolve'], ['g1']);
    });

    test('categories add/delete', () async {
      final id = await cats.add('t1', 'Fuel', icon: 'fuel');
      expect((await cats.watch('t1').first).single.name, 'Fuel');
      await cats.delete(id);
      expect(await cats.watch('t1').first, isEmpty);
      expect((await outbox.all()).map((i) => i.type), [OutboxType.addCategory, OutboxType.deleteCategory]);
    });
  });

  group('pull sync', () {
    test('initial sync hydrates trip, members, groups, categories, expenses', () async {
      reader.ids = ['t1'];
      reader.responses['t1'] = changes(trip: tripRow('t1'), expenses: [expRow('e1')]);
      await pull.syncAll();
      final trip = await trips.watchTrip('t1').first;
      expect(trip!.joinCode, 'ABC123');
      expect(trip.memberIds, ['m1', 'm2']);
      expect(trip.groupIds, ['g1']);
      expect((await members.watchGroups('t1').first).single.memberIds, ['m1', 'm2']);
      final e = (await expenses.watchActive('t1').first).single;
      expect(e.splitMemberIds, ['m1', 'm2']);
      expect(e.resolvedShares, {'m1': 50.0, 'm2': 50.0});
      expect(reader.sinceCalls.single, isNull);
    });

    test('incremental sync uses cursor minus skew', () async {
      reader.ids = ['t1'];
      reader.responses['t1'] = changes(trip: tripRow('t1'));
      await pull.syncAll();
      await pull.syncAll();
      expect(reader.sinceCalls.last, DateTime.utc(2026, 1, 3).subtract(TripPullSync.skew));
    });

    test('tombstones hard-delete clean expenses', () async {
      reader.ids = ['t1'];
      reader.responses['t1'] = changes(trip: tripRow('t1'), expenses: [expRow('e1')]);
      await pull.syncAll();
      reader.responses['t1'] = changes(tombstones: ['e1']);
      await pull.syncAll();
      expect(await expenses.watchActive('t1').first, isEmpty);
    });

    test('recycle bin: tombstoned expenses still inside the bin window stay restorable', () async {
      reader.ids = ['t1'];
      reader.responses['t1'] = changes(trip: tripRow('t1'), expenses: [expRow('e1'), expRow('e2')]);
      await pull.syncAll();
      // e1 is soft-deleted on the server: the delta feed reports a tombstone, the bin read returns the row.
      reader.responses['t1'] = changes(tombstones: ['e1']);
      reader.recycled = [{...expRow('e1'), 'deleted_at': '2026-01-02T10:00:00Z'}];
      await pull.syncAll();
      expect((await expenses.watchActive('t1').first).map((e) => e.id), ['e2']);
      final bin = await expenses.watchRecycled('t1').first;
      expect(bin.single.id, 'e1');
      expect(bin.single.deletedAt, isNotNull);
      // Purged from the bin server-side: tombstone with nothing recycled removes it for good.
      reader.responses['t1'] = changes(tombstones: ['e1']);
      reader.recycled = [];
      await pull.syncAll();
      expect(await expenses.watchRecycled('t1').first, isEmpty);
    });

    test('dirty protection: pending local edit survives a pull and surfaces a conflict', () async {
      reader.ids = ['t1'];
      reader.responses['t1'] = changes(trip: tripRow('t1'), expenses: [expRow('e1')]);
      await pull.syncAll();
      final local = (await expenses.watchActive('t1').first).single;
      await expenses.update(local.copyWith(amount: 999)); // unsynced edit
      reader.responses['t1'] = changes(expenses: [expRow('e1', amount: 200)]);
      final res = await pull.syncAll();
      expect((await expenses.watchActive('t1').first).single.amount, 999);
      final c = res['t1']!.conflicts.single;
      expect(c.local.amount, 999);
      expect(c.server.amount, 200);
      expect(c.queuedOp, OutboxType.updateExpense);
    });

    test('trip removed on server is dropped locally unless dirty', () async {
      reader.ids = ['t1'];
      reader.responses['t1'] = changes(trip: tripRow('t1'), expenses: [expRow('e1')]);
      await pull.syncAll();
      reader.ids = [];
      await pull.syncAll();
      expect(await trips.watchTrips().first, isEmpty);
      expect(await expenses.watchActive('t1').first, isEmpty);
      expect(await pull.cursor('t1'), isNull);

      // A trip created offline (pending createTrip) must survive.
      final id = await trips.createTrip(
          name: 'New', startDate: '2026-02-01', endDate: '2026-02-02', baseCurrency: 'INR', ownerId: 'u1', creatorName: 'Asha');
      await pull.syncAll();
      expect((await trips.watchTrips().first).single.id, id);
    });
  });
}
